"""Authenticated routes for adaptive quiz sessions."""
import logging
from typing import Any, Dict, List

# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException
# pyrefly: ignore [missing-import]
from pydantic import BaseModel, Field

from app.auth import get_current_user
from app.demo_log import step
from app.ingest import KnowledgeBase
from app.materials import check_kb_access
from app.quiz_engine import QuizGenerationError
from app.quiz_session import (
    QuizFinishedError,
    QuizState,
    QuizStateError,
    build_next_question,
    build_quiz_summary,
    create_quiz_state,
    list_quizzes,
    load_quiz,
    public_quiz,
    save_quiz,
    submit_answer,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/quizzes", tags=["quizzes"])


class CreateQuizRequest(BaseModel):
    kb_id: str
    concept_count: int = Field(default=4, ge=1)


class AnswerQuizRequest(BaseModel):
    question_id: str
    choice: int
    confident: bool
    reasoning: str = ""


def _owned_quiz(quiz_id: str, user: Dict[str, Any]) -> QuizState:
    """Loads a quiz and enforces ownership, mirroring Nova session rules."""
    try:
        state = load_quiz(quiz_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Quiz not found.")
    except QuizStateError:
        raise HTTPException(status_code=404, detail="Quiz not found.")
    if str(state.owner_id) != str(user["id"]):
        raise HTTPException(status_code=403, detail="You do not own this quiz.")
    return state


@router.post("")
def create_quiz(
    request: CreateQuizRequest,
    user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Starts a quiz from a ready knowledge base."""
    meta = check_kb_access(request.kb_id, user)
    if meta is not None and meta.get("state") != "ready":
        raise HTTPException(
            status_code=409,
            detail=f"This material is not ready for a quiz (state: {meta.get('state')}).",
        )
    try:
        state = create_quiz_state(
            request.kb_id,
            str(user["id"]),
            concept_count=request.concept_count,
        )
    except QuizStateError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    save_quiz(state)
    return public_quiz(state)


@router.get("")
def get_quizzes(user: Dict[str, Any] = Depends(get_current_user)) -> List[Dict[str, Any]]:
    """Lists only the current user's quizzes."""
    return list_quizzes(str(user["id"]))


@router.get("/{quiz_id}/summary")
def get_quiz_summary(
    quiz_id: str, user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """Returns concept mastery feedback and weak misconception ids."""
    state = _owned_quiz(quiz_id, user)
    return build_quiz_summary(state)


@router.get("/{quiz_id}")
def get_quiz(
    quiz_id: str, user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """Returns one quiz without any answer keys."""
    return public_quiz(_owned_quiz(quiz_id, user))


@router.post("/{quiz_id}/next")
def next_quiz_question(
    quiz_id: str, user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """Generates (or returns) the next question without answer-key fields."""
    state = _owned_quiz(quiz_id, user)
    try:
        kb = KnowledgeBase.load(state.kb_id)
        result = build_next_question(state, kb)
    except QuizFinishedError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except QuizGenerationError as exc:
        step(
            "ERROR",
            "quiz next question failed",
            quiz_id=quiz_id,
            error=str(exc),
        )
        raise HTTPException(
            status_code=502,
            detail="Could not generate the next question. Please retry.",
        )
    except Exception as exc:
        logger.exception("Quiz question generation failed")
        step(
            "ERROR",
            "quiz next question failed",
            quiz_id=quiz_id,
            error=str(exc),
        )
        raise HTTPException(
            status_code=502,
            detail="Could not generate the next question. Please retry.",
        )
    save_quiz(state)
    return result


def _feedback_case(result: Dict[str, Any]) -> str:
    """Names the feedback panel case used by the frontend."""
    status = result.get("concept_status")
    if status == "needs_review":
        return "needs_review"
    if status == "mastered":
        return "mastered"
    if result.get("correct"):
        return "correct-unsure" if result.get("uncertain") else "correct-sure"
    return "wrong"


@router.post("/{quiz_id}/answer")
def answer_quiz_question(
    quiz_id: str,
    request: AnswerQuizRequest,
    user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Grades one answer in plain Python and advances the quiz state."""
    state = _owned_quiz(quiz_id, user)
    try:
        result = submit_answer(
            state,
            request.question_id,
            request.choice,
            request.confident,
            request.reasoning,
        )
    except QuizStateError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    save_quiz(state)

    source = result.get("source") or {}
    sections = []
    for name in ("chosen_misconception", "why_wrong", "explanation", "example"):
        if result.get(name):
            sections.append(
                "misconception" if name == "chosen_misconception" else name
            )
    if source:
        sections.append("source")
    line_start = source.get("line_start")
    line_end = source.get("line_end")
    step(
        "QUIZ",
        "answer feedback returned",
        quiz_id=quiz_id,
        question_id=request.question_id,
        case=_feedback_case(result),
        sections=", ".join(sections) or "-",
        source_page=source.get("page") or "-",
        source_lines=(
            f"{line_start}-{line_end}"
            if line_start is not None and line_end is not None
            else "-"
        ),
        correct_index=result.get("correct_index"),
        next_concept=result.get("next_concept") or "-",
    )
    return result
