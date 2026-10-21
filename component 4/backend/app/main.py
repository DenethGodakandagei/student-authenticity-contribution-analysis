import os
import json
import re
import shutil
import time
import logging
from contextlib import asynccontextmanager
from email.parser import BytesParser
from email.policy import default as email_policy
from typing import Any, List, Optional
from urllib.parse import parse_qsl
# pyrefly: ignore [missing-import]
import jwt
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

# Existing app loggers (logger.info/warning/error) should be visible in the terminal.
logging.basicConfig(level=logging.INFO)
logging.getLogger("app").setLevel(logging.INFO)

# pyrefly: ignore [missing-import]
from fastapi import FastAPI, UploadFile, File, HTTPException, status, Depends, Request, Response
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware
# pyrefly: ignore [missing-import]
from pydantic import BaseModel
from app.pdf_processor import process_pdf
from app.misconception_generator import generate_student_misconceptions
from app.nova_agent import NovaStudentAgent, understanding_summary
from app.auth import router as auth_router, get_current_user, check_connection
from app.learning_eval import router as learning_eval_router
from app.materials import router as materials_router, check_kb_access
from app.quiz_routes import router as quiz_router
from app.lecturer_routes import router as lecturer_router
from app.study_guide_routes import router as study_guide_router
from app.config import settings
from app.demo_log import DEMO_LOG_ENABLED, step


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Fail fast if MongoDB (used for authentication) is unreachable.
    check_connection()
    yield


app = FastAPI(title="AI-Based Virtual Student API", lifespan=lifespan)

# Auth routes (registration, login, /me, logout)
app.include_router(auth_router)

# Stage 9 pre/post test routes
app.include_router(learning_eval_router)

# Student PDF materials (private knowledge bases)
app.include_router(materials_router)

# Adaptive quiz sessions
app.include_router(quiz_router)

# Lecturer-only analytics and student management
app.include_router(lecturer_router)

# Study guide and progressive hints
app.include_router(study_guide_router)

# Setup CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["Authorization", "Content-Type"],
)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
SESSIONS_DIR = os.path.join(BASE_DIR, "sessions")
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(SESSIONS_DIR, exist_ok=True)

# ---------------------------------------------------------------------------
# Demo HTTP logging (terminal only; never changes request/response contents)
# ---------------------------------------------------------------------------
DEMO_LOG_BODY_LIMIT = 800
DEMO_LOG_RESPONSE_BYTES_LIMIT = 200_000
_SENSITIVE_KEYS = {
    "password",
    "password_hash",
    "salt",
    "token",
    "access_token",
    "refresh_token",
    "authorization",
    "jwt",
    "jwt_secret",
    "secret",
    "api_key",
    "openai_api_key",
    "hf_token",
    "mongo_uri",
    "lecturer_code",
}
_JWT_VALUE_RE = re.compile(r"^[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}$")
_JSON_BODY_RE = re.compile(rb"^\s*[\[{]")
_BINARY_CONTENT_TYPES = (
    "application/pdf",
    "application/octet-stream",
    "application/zip",
    "image/",
    "audio/",
    "video/",
    "text/event-stream",
)


def _truncate_log_text(text: str, limit: int = DEMO_LOG_BODY_LIMIT) -> str:
    return text if len(text) <= limit else f"{text[:limit]}...(truncated)"


def _is_sensitive_key(key: str) -> bool:
    return key.strip().lower().replace("-", "_") in _SENSITIVE_KEYS


def _redact_log_value(value: Any) -> Any:
    if isinstance(value, dict):
        return {
            key: "***" if _is_sensitive_key(str(key)) else _redact_log_value(item)
            for key, item in value.items()
        }
    if isinstance(value, list):
        return [_redact_log_value(item) for item in value]
    if isinstance(value, tuple):
        return tuple(_redact_log_value(item) for item in value)
    if isinstance(value, str) and _JWT_VALUE_RE.match(value.strip()):
        return "***"
    return value


def _contains_answer_key(value: Any) -> bool:
    if isinstance(value, dict):
        if any(key in {"correct_index", "expected_answer", "answer_key"} for key in value):
            return True
        return any(_contains_answer_key(item) for item in value.values())
    if isinstance(value, list):
        return any(_contains_answer_key(item) for item in value)
    return False


def _format_json_log(value: Any) -> tuple[str, bool]:
    text = json.dumps(_redact_log_value(value), indent=2, ensure_ascii=False, default=str)
    return _truncate_log_text(text), _contains_answer_key(value)


def _format_payload_log(raw: bytes, content_type: str) -> tuple[str, bool]:
    if not raw:
        return "<empty>", False
    lower_type = (content_type or "").lower()
    if "json" in lower_type or _JSON_BODY_RE.match(raw):
        try:
            return _format_json_log(json.loads(raw))
        except (json.JSONDecodeError, UnicodeDecodeError):
            pass
    return _truncate_log_text(raw.decode("utf-8", errors="replace")), False


def _multipart_file_summary(raw: bytes, content_type: str) -> str:
    try:
        message = BytesParser(policy=email_policy).parsebytes(
            b"Content-Type: "
            + content_type.encode("latin-1", errors="replace")
            + b"\r\nMIME-Version: 1.0\r\n\r\n"
            + raw
        )
        files = []
        for part in message.iter_parts():
            filename = part.get_filename()
            if filename:
                payload = part.get_payload(decode=True) or b""
                files.append(f"{filename} ({len(payload)} bytes)")
        return ", ".join(files) if files else "<multipart upload>"
    except Exception:
        return "<multipart upload>"


def _form_body_log(raw: bytes) -> str:
    try:
        pairs = parse_qsl(raw.decode("utf-8", errors="replace"), keep_blank_values=True)
    except Exception:
        return "<form body>"
    return "&".join(
        f"{key}={'***' if _is_sensitive_key(key) or _JWT_VALUE_RE.match(value.strip()) else value}"
        for key, value in pairs
    )


def _request_body_log(raw: bytes, content_type: str) -> str:
    lower_type = (content_type or "").lower()
    if "multipart/form-data" in lower_type:
        return _multipart_file_summary(raw, content_type)
    if "application/x-www-form-urlencoded" in lower_type:
        return _truncate_log_text(_form_body_log(raw))
    text, _ = _format_payload_log(raw, content_type)
    return text


def _caller_from_request(request: Request) -> str:
    header = request.headers.get("authorization", "")
    if not header.lower().startswith("bearer "):
        return "anonymous"
    token = header[7:].strip()
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
        )
    except Exception:
        return "anonymous"
    subject = payload.get("sub")
    return f"user:{subject}" if subject else "anonymous"


def _query_log(request: Request) -> str:
    parts = []
    for key, value in request.query_params.multi_items():
        safe_value = (
            "***"
            if _is_sensitive_key(key) or _JWT_VALUE_RE.match(value.strip())
            else value
        )
        parts.append(f"{key}={safe_value}")
    return "&".join(parts) if parts else "-"


def _is_file_response(response: Response) -> bool:
    content_type = response.headers.get("content-type", "").lower()
    disposition = response.headers.get("content-disposition", "").lower()
    if "attachment" in disposition:
        return True
    return any(token in content_type for token in _BINARY_CONTENT_TYPES)


def _rebuild_response(response: Response, body: bytes) -> Response:
    return Response(
        content=body,
        status_code=response.status_code,
        headers=dict(response.headers),
        media_type=response.media_type,
        background=response.background,
    )


@app.middleware("http")
async def demo_http_logger(request: Request, call_next):
    """Logs every request/response without changing what the route returns."""
    if not DEMO_LOG_ENABLED:
        return await call_next(request)

    started = time.perf_counter()
    raw_body = b""
    try:
        raw_body = await request.body()
    except Exception as exc:
        step("ERROR", "request body read failed", path=request.url.path, error=str(exc))

    content_type = request.headers.get("content-type", "")
    step(
        "HTTP",
        "request",
        method=request.method,
        path=request.url.path,
        query=_query_log(request),
        caller=_caller_from_request(request),
        body=_request_body_log(raw_body, content_type),
    )

    try:
        response = await call_next(request)
    except Exception as exc:
        step(
            "ERROR",
            "request failed",
            method=request.method,
            path=request.url.path,
            ms=round((time.perf_counter() - started) * 1000, 1),
            error=str(exc),
        )
        raise

    duration_ms = round((time.perf_counter() - started) * 1000, 1)
    body_log = "<file/binary response omitted>"
    answer_key = False

    if not _is_file_response(response):
        content_length = response.headers.get("content-length")
        try:
            too_large = (
                content_length is not None
                and int(content_length) > DEMO_LOG_RESPONSE_BYTES_LIMIT
            )
        except ValueError:
            too_large = False

        if too_large:
            body_log = f"<large response omitted ({content_length} bytes)>"
        else:
            if hasattr(response, "body_iterator"):
                chunks = []
                try:
                    async for chunk in response.body_iterator:
                        chunks.append(chunk)
                except Exception as exc:
                    step(
                        "ERROR",
                        "response read failed",
                        path=request.url.path,
                        error=str(exc),
                    )
                    raise
                raw_response = b"".join(chunks)
                response = _rebuild_response(response, raw_response)
            else:
                raw_response = response.body
            body_log, answer_key = _format_payload_log(
                raw_response, response.headers.get("content-type", "")
            )

    step(
        "HTTP",
        "response",
        status=response.status_code,
        ms=duration_ms,
        body=body_log,
        **({"note": "server-side only"} if answer_key else {}),
    )
    return response


class ChatMessageRequest(BaseModel):
    message: str

class CreateSessionRequest(BaseModel):
    atlas_output: dict

class CreateFromKbRequest(BaseModel):
    kb_id: str
    misconception_ids: Optional[List[str]] = None
    count: int = 2

def _check_session_owner(nova: NovaStudentAgent, user: dict) -> None:
    """Raises 403 if the session is owned by a different user. Unowned sessions stay open."""
    if nova.state.owner_id and nova.state.owner_id != str(user["id"]):
        raise HTTPException(status_code=403, detail="You do not own this session.")

@app.get("/")
def read_root():
    return {"message": "Welcome to AI-Based Virtual Student API"}

@app.post("/upload-material")
async def upload_material(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    filename = file.filename or "material.pdf"
    ext = os.path.splitext(filename)[1].lower()
    allowed_exts = {".pdf", ".docx", ".pptx", ".txt", ".text"}
    if ext not in allowed_exts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Only PDF, DOCX, PPTX, and TXT files are allowed."
        )

    saved_filepath = os.path.join(UPLOAD_DIR, filename)

    try:
        # Save file to uploads folder
        with open(saved_filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        from app.ingest import extract_pages
        extracted_pages = extract_pages(saved_filepath)
        page_count = len(extracted_pages)
        full_extracted_text = "\n\n".join(p["text"] for p in extracted_pages if p.get("text")).strip()

        if not full_extracted_text:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"The uploaded file '{filename}' contains no readable text. If it is a scanned document or image-only presentation, please upload a text-readable PDF, PPTX, or DOCX file."
            )

        num_chunks = max(1, len(full_extracted_text) // 500)

        # 2. Send extracted lecture text to Atlas Misconception Generator
        misconception_result = generate_student_misconceptions(full_extracted_text)

        # 3. Automatically initialize Nova student agent session
        nova = NovaStudentAgent.from_atlas_output(misconception_result)
        nova.state.owner_id = str(user["id"])
        session_file = os.path.join(SESSIONS_DIR, f"{nova.state.session_id}.json")
        nova.save_state(session_file)

        # 4. Return updated JSON structure
        return {
            "filename": filename,
            "session_id": nova.state.session_id,
            "number_of_pages": page_count,
            "number_of_chunks": num_chunks,
            "detected_topic": misconception_result.get("topic", "General Topic"),
            "learning_objectives": misconception_result.get("learning_objectives", []),
            "generated_misconceptions": misconception_result.get("misconceptions", []),
            "nova_state": nova.to_dict()
        }

    except HTTPException:
        # Re-raise explicit HTTP exceptions directly
        raise
    except Exception as e:
        # Cleanup file if processing fails, handling Windows file lock safely
        if os.path.exists(saved_filepath):
            try:
                os.remove(saved_filepath)
            except OSError:
                pass
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while processing the file: {str(e)}"
        )

# ============================================================================
# Nova AI Student Session Endpoints
# ============================================================================

@app.post("/sessions/create-nova")
def create_nova_session(req: CreateSessionRequest, user: dict = Depends(get_current_user)):
    try:
        nova = NovaStudentAgent.from_atlas_output(req.atlas_output)
        nova.state.owner_id = str(user["id"])
        session_file = os.path.join(SESSIONS_DIR, f"{nova.state.session_id}.json")
        nova.save_state(session_file)
        return {
            "message": "Nova AI Student session created successfully.",
            "session_id": nova.state.session_id,
            "state": nova.to_dict()
        }
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create Nova session: {str(e)}")

@app.post("/sessions/create-from-kb")
def create_session_from_kb(req: CreateFromKbRequest, user: dict = Depends(get_current_user)):
    """Creates a Nova session from a knowledge base's misconception repository."""
    check_kb_access(req.kb_id, user)
    try:
        nova = NovaStudentAgent.from_repository(
            kb_id=req.kb_id,
            misconception_ids=req.misconception_ids,
            count=req.count,
        )
        nova.state.owner_id = str(user["id"])
        session_file = os.path.join(SESSIONS_DIR, f"{nova.state.session_id}.json")
        nova.save_state(session_file)
        step(
            "NOVA",
            "create-from-kb misconceptions",
            kb_id=req.kb_id,
            requested_ids=", ".join(req.misconception_ids or []) or "-",
            requested_count=req.count,
            chosen_count=len(nova.state.misconceptions),
            chosen=[
                {
                    "id": item.id,
                    "concept": item.concept,
                    "wrong_concept": item.wrong_concept,
                }
                for item in nova.state.misconceptions
            ],
        )
        return {
            "session_id": nova.state.session_id,
            "state": nova.to_dict()
        }
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create session from kb: {str(e)}")

@app.get("/sessions")
def list_sessions(user: dict = Depends(get_current_user)):
    """Returns the current user's sessions."""
    sessions = []
    owner = str(user["id"])
    if not os.path.isdir(SESSIONS_DIR):
        return sessions
    for fname in os.listdir(SESSIONS_DIR):
        if not fname.endswith(".json"):
            continue
        path = os.path.join(SESSIONS_DIR, fname)
        try:
            with open(path, "r", encoding="utf-8") as f:
                state = json.load(f)
        except (OSError, json.JSONDecodeError):
            continue
        if state.get("owner_id") != owner:
            continue
        misconceptions = state.get("misconceptions", [])
        sessions.append({
            "session_id": state.get("session_id", fname[:-5]),
            "topic": state.get("topic", ""),
            "created_at": state.get("created_at"),
            "updated_at": state.get("updated_at"),
            "learned_count": sum(1 for m in misconceptions if m.get("is_corrected")),
            "total_count": len(misconceptions),
        })
    return sessions

@app.get("/sessions/{session_id}")
def get_nova_session(session_id: str, user: dict = Depends(get_current_user)):
    session_file = os.path.join(SESSIONS_DIR, f"{session_id}.json")
    if not os.path.exists(session_file):
        raise HTTPException(status_code=404, detail="Session not found.")
    try:
        nova = NovaStudentAgent.load_state(session_file)
        _check_session_owner(nova, user)
        return nova.to_public_dict()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load session: {str(e)}")

@app.get("/sessions/{session_id}/summary")
def get_session_summary(session_id: str, user: dict = Depends(get_current_user)):
    """Returns the understanding summary of the current user's own session."""
    session_file = os.path.join(SESSIONS_DIR, f"{session_id}.json")
    if not os.path.exists(session_file):
        raise HTTPException(status_code=404, detail="Session not found.")
    try:
        nova = NovaStudentAgent.load_state(session_file)
        _check_session_owner(nova, user)
        return understanding_summary(nova.state)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load session summary: {str(e)}")

@app.post("/sessions/{session_id}/exam")
def run_exam(session_id: str, user: dict = Depends(get_current_user)):
    """Run an exam for the given Nova session.

    The exam generates assessment questions from Nova's misconceptions, asks Nova to answer them,
    evaluates the answers using the LLM, and returns a detailed report.
    """
    session_file = os.path.join(SESSIONS_DIR, f"{session_id}.json")
    if not os.path.exists(session_file):
        raise HTTPException(status_code=404, detail="Session not found.")
    try:
        # Load Nova session
        nova = NovaStudentAgent.load_state(session_file)
        _check_session_owner(nova, user)

        # -------------------------------------------------------------------
        # Generate assessment questions targeting current misconceptions
        # -------------------------------------------------------------------
        from app.assessment_generator import generate_assessment
        # Prepare misconceptions data for assessment generator
        mis_data = [
            {
                "wrong_concept": m.wrong_concept,
                "correct_concept": m.correct_concept,
                "reason": m.reason,
            }
            for m in nova.state.misconceptions
        ]
        questions = generate_assessment(
            lecture_text="",
            learning_objectives=nova.state.learning_objectives,
            misconceptions=mis_data,
        )

        # -------------------------------------------------------------------
        # Nova answers each question using its LLM provider (without mutating state)
        # -------------------------------------------------------------------
        correct_answers = []
        incorrect_answers = []
        for q in questions:
            # Build a prompt for Nova to answer the question
            answer_prompt = (
                f"You are Nova, an AI student that answers based ONLY on current misconceptions.\n"
                f"Question: {q['question']}\n"
            )
            nova_answer = nova.provider.generate(answer_prompt).strip()

            # Evaluate correctness via LLM (simple string match for demo purposes)
            is_correct = False
            if q["type"] == "mcq":
                # MCQ expected answer is the index of correct option
                correct_idx = q["expected_answer"]
                # Check if the correct option text appears in Nova's answer
                options = q.get("options", [])
                if correct_idx < len(options):
                    correct_text = options[correct_idx]
                    if correct_text.lower() in nova_answer.lower():
                        is_correct = True
            else:  # short answer
                expected = q["expected_answer"].lower()
                if expected in nova_answer.lower():
                    is_correct = True

            result_entry = {
                "question": q["question"],
                "type": q["type"],
                "expected_answer": q["expected_answer"],
                "nova_answer": nova_answer,
                "is_correct": is_correct,
            }
            if is_correct:
                correct_answers.append(result_entry)
            else:
                incorrect_answers.append(result_entry)

        total = len(questions)
        correct_count = len(correct_answers)
        score = round((correct_count / total * 100.0) if total > 0 else 0.0, 2)

        # Remaining misconceptions are those still marked not corrected
        remaining_mis = [m for m in nova.state.misconceptions if not m.is_corrected]

        return {
            "session_id": session_id,
            "total_questions": total,
            "score": score,
            "correct_answers": correct_answers,
            "incorrect_answers": incorrect_answers,
            "remaining_misconceptions": [m.model_dump() for m in remaining_mis],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to run exam: {str(e)}")

@app.post("/sessions/{session_id}/chat")
@app.post("/teaching-session/{session_id}/chat")
def chat_with_nova(session_id: str, req: ChatMessageRequest, user: dict = Depends(get_current_user)):
    """
    Teaching session endpoint: University student teaches Nova.
    Nova responds based on current uncorrected misconceptions, acknowledges correct explanations,
    and updates conversation history and knowledge state in real time.
    """
    session_file = os.path.join(SESSIONS_DIR, f"{session_id}.json")
    if not os.path.exists(session_file):
        raise HTTPException(status_code=404, detail=f"Teaching session '{session_id}' not found.")

    try:
        nova = NovaStudentAgent.load_state(session_file)
        _check_session_owner(nova, user)
        result = nova.respond(req.message)
        nova.save_state(session_file)
        return {
            "session_id": session_id,
            "topic": nova.state.topic,
            "teacher_message": req.message,
            "nova_response": result["nova_response"],
            "newly_corrected_ids": result["newly_corrected_ids"],
            "learning_progress": result["learning_progress"],
            "unresolved_misconceptions_count": result["unresolved_misconceptions_count"],
            "learned_misconceptions_count": result["learned_misconceptions_count"],
            "check_question": result["check_question"],
            "check_result": result["check_result"],
            "check_feedback": result["check_feedback"],
            "understanding": result["understanding"],
            "detection": result["detection"],
            "conversation_history": nova.state.conversation_history,
            "updated_state": nova.to_public_dict()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in Nova teaching session: {str(e)}")



