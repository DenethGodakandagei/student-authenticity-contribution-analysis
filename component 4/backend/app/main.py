import os
import json
import shutil
from contextlib import asynccontextmanager
from typing import List, Optional
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

# pyrefly: ignore [missing-import]
from fastapi import FastAPI, UploadFile, File, HTTPException, status, Depends
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware
# pyrefly: ignore [missing-import]
from pydantic import BaseModel
from app.pdf_processor import process_pdf
from app.misconception_generator import generate_student_misconceptions
from app.nova_agent import NovaStudentAgent, understanding_summary
from app.auth import router as auth_router, get_current_user, check_connection
from app.learning_eval import router as learning_eval_router


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
    # Validation 1: Check file extension
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Only PDF files are allowed."
        )

    # Validation 2: Check content/mime type if available
    if file.content_type and file.content_type != "application/pdf":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file content type is not application/pdf."
        )

    saved_filepath = os.path.join(UPLOAD_DIR, file.filename)

    try:
        # Save file to uploads folder
        with open(saved_filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # 1. Process PDF using pdf_processor (Extract text & chunks)
        pdf_result = process_pdf(saved_filepath)

        # Join generated text chunks (or preview text) for Atlas input
        full_extracted_text = "\n".join(pdf_result["chunks"]) if pdf_result["chunks"] else pdf_result["preview_text"]

        # 2. Send extracted lecture text to Atlas Misconception Generator
        misconception_result = generate_student_misconceptions(full_extracted_text)

        # 3. Automatically initialize Nova student agent session
        nova = NovaStudentAgent.from_atlas_output(misconception_result)
        nova.state.owner_id = str(user["id"])
        session_file = os.path.join(SESSIONS_DIR, f"{nova.state.session_id}.json")
        nova.save_state(session_file)

        # 4. Return updated JSON structure
        return {
            "filename": file.filename,
            "session_id": nova.state.session_id,
            "number_of_pages": pdf_result["num_pages"],
            "number_of_chunks": pdf_result["num_chunks"],
            "detected_topic": misconception_result.get("topic", "General Topic"),
            "learning_objectives": misconception_result.get("learning_objectives", []),
            "generated_misconceptions": misconception_result.get("misconceptions", []),
            "nova_state": nova.to_dict()
        }

    except Exception as e:
        # Cleanup file if processing fails
        if os.path.exists(saved_filepath):
            os.remove(saved_filepath)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while processing the PDF file: {str(e)}"
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
    try:
        nova = NovaStudentAgent.from_repository(
            kb_id=req.kb_id,
            misconception_ids=req.misconception_ids,
            count=req.count,
        )
        nova.state.owner_id = str(user["id"])
        session_file = os.path.join(SESSIONS_DIR, f"{nova.state.session_id}.json")
        nova.save_state(session_file)
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



