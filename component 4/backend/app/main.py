import os
import shutil
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

# pyrefly: ignore [missing-import]
from fastapi import FastAPI, UploadFile, File, HTTPException, status
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware
# pyrefly: ignore [missing-import]
from pydantic import BaseModel
from app.pdf_processor import process_pdf
from app.misconception_generator import generate_student_misconceptions
from app.nova_agent import NovaStudentAgent


app = FastAPI(title="AI-Based Virtual Student API")

# Setup CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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

@app.get("/")
def read_root():
    return {"message": "Welcome to AI-Based Virtual Student API"}

@app.post("/upload-material")
async def upload_material(file: UploadFile = File(...)):
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
def create_nova_session(req: CreateSessionRequest):
    try:
        nova = NovaStudentAgent.from_atlas_output(req.atlas_output)
        session_file = os.path.join(SESSIONS_DIR, f"{nova.state.session_id}.json")
        nova.save_state(session_file)
        return {
            "message": "Nova AI Student session created successfully.",
            "session_id": nova.state.session_id,
            "state": nova.to_dict()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create Nova session: {str(e)}")

@app.get("/sessions/{session_id}")
def get_nova_session(session_id: str):
    session_file = os.path.join(SESSIONS_DIR, f"{session_id}.json")
    if not os.path.exists(session_file):
        raise HTTPException(status_code=404, detail="Session not found.")
    try:
        nova = NovaStudentAgent.load_state(session_file)
        return nova.to_dict()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load session: {str(e)}")

@app.post("/sessions/{session_id}/exam")
def run_exam(session_id: str):
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
def chat_with_nova(session_id: str, req: ChatMessageRequest):
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
            "conversation_history": nova.state.conversation_history,
            "updated_state": nova.to_dict()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in Nova teaching session: {str(e)}")



