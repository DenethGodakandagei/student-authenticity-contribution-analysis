"""
Adaptive quiz sessions stored as backend/quizzes/{quiz_id}.json.

The state machine is plain Python: angles advance in difficulty order, wrong
answers trigger a re-test of the misconception the student chose, mastery needs
three confident correct answers across three angles (including application or
code_trace), and three wrong answers move a concept to needs_review.
"""
import difflib
import json
import os
import secrets
import uuid
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List, Literal, Optional

# pyrefly: ignore [missing-import]
from pydantic import BaseModel, Field

from app.demo_log import decision, step
from app.ingest import KNOWLEDGE_DIR
from app.quiz_engine import ANGLES, QuizGenerationError, generate_question

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
QUIZZES_DIR = os.path.join(BASE_DIR, "quizzes")
DEFAULT_CONCEPT_COUNT = 4
TERMINAL_STATUSES = {"mastered", "needs_review"}
MASTERY_ANGLES = {"application", "code_trace"}


class ConceptState(BaseModel):
    name: str
    status: Literal["new", "practicing", "mastered", "needs_review"] = "new"
    streak: int = 0
    wrong_count: int = 0
    angles_used: List[str] = Field(default_factory=list)
    misconceptions_hit: List[str] = Field(default_factory=list)


class QuizState(BaseModel):
    quiz_id: str
    owner_id: str
    kb_id: str
    concepts: List[ConceptState] = Field(default_factory=list)
    history: List[Dict[str, Any]] = Field(default_factory=list)
    current_concept: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    current_question: Optional[Dict[str, Any]] = None


class QuizFinishedError(RuntimeError):
    """Raised when a quiz has no concepts left to practise."""


class QuizStateError(ValueError):
    """Raised for invalid quiz state transitions or answer payloads."""


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def quiz_path(quiz_id: str) -> str:
    """Returns the JSON path for a safe quiz id."""
    if not quiz_id or os.path.basename(quiz_id) != quiz_id or quiz_id in {".", ".."}:
        raise QuizStateError("Invalid quiz id.")
    return os.path.join(QUIZZES_DIR, f"{quiz_id}.json")


def _normalise(text: str) -> str:
    return " ".join(text.split()).lower()


def _read_json(path: str, default: Any) -> Any:
    try:
        with open(path, "r", encoding="utf-8") as handle:
            return json.load(handle)
    except (OSError, json.JSONDecodeError):
        return default


def _load_concept_names(kb_id: str) -> List[str]:
    """Loads concepts.json, falling back to distinct misconception concepts."""
    kb_dir = os.path.join(KNOWLEDGE_DIR, kb_id)
    raw = _read_json(os.path.join(kb_dir, "concepts.json"), None)
    names: List[str] = []
    if isinstance(raw, list):
        for item in raw:
            if isinstance(item, str):
                name = item
            elif isinstance(item, dict):
                name = item.get("name") or item.get("concept") or ""
            else:
                continue
            name = str(name).strip()
            if name and name not in names:
                names.append(name)
    if names:
        return names

    misconceptions = _read_json(os.path.join(kb_dir, "misconceptions.json"), [])
    if isinstance(misconceptions, list):
        for item in misconceptions:
            if not isinstance(item, dict):
                continue
            name = str(item.get("concept") or "").strip()
            if name and name not in names:
                names.append(name)
    return names


def kb_name(kb_id: str) -> str:
    """Returns the material name when meta.json exists, else the kb id."""
    meta = _read_json(os.path.join(KNOWLEDGE_DIR, kb_id, "meta.json"), {})
    if isinstance(meta, dict) and meta.get("name"):
        return str(meta["name"])
    return kb_id


def create_quiz_state(
    kb_id: str,
    owner_id: str,
    concept_count: int = DEFAULT_CONCEPT_COUNT,
) -> QuizState:
    """Creates a new quiz state with the first up to concept_count concepts."""
    if concept_count < 1:
        raise QuizStateError("concept_count must be at least 1.")
    names = _load_concept_names(kb_id)
    if not names:
        raise QuizStateError(f"No concepts found for knowledge base '{kb_id}'.")
    selected = names[:concept_count]
    state = QuizState(
        quiz_id=secrets.token_hex(8),
        owner_id=str(owner_id),
        kb_id=kb_id,
        concepts=[ConceptState(name=name) for name in selected],
        current_concept=selected[0],
    )
    step(
        "QUIZ",
        "quiz created",
        quiz_id=state.quiz_id,
        owner=state.owner_id,
        kb_id=kb_id,
        concepts=", ".join(selected),
        concept_count=len(selected),
    )
    return state


def save_quiz(state: QuizState) -> None:
    """Atomically writes one quiz state to backend/quizzes/{quiz_id}.json."""
    os.makedirs(QUIZZES_DIR, exist_ok=True)
    path = quiz_path(state.quiz_id)
    temp = f"{path}.tmp"
    with open(temp, "w", encoding="utf-8") as handle:
        json.dump(state.model_dump(), handle, indent=2, ensure_ascii=False)
    os.replace(temp, path)


def load_quiz(quiz_id: str) -> QuizState:
    """Loads a quiz state or raises FileNotFoundError."""
    path = quiz_path(quiz_id)
    if not os.path.exists(path):
        raise FileNotFoundError(f"Quiz '{quiz_id}' not found.")
    with open(path, "r", encoding="utf-8") as handle:
        return QuizState(**json.load(handle))


def _progress(state: QuizState) -> Dict[str, Any]:
    total = len(state.concepts)
    mastered = sum(1 for concept in state.concepts if concept.status == "mastered")
    needs_review = sum(
        1 for concept in state.concepts if concept.status == "needs_review"
    )
    completed = mastered + needs_review
    return {
        "completed": completed,
        "total": total,
        "mastered": mastered,
        "needs_review": needs_review,
        "percent": round((completed / total) * 100) if total else 0,
    }


def is_finished(state: QuizState) -> bool:
    """True when every concept is mastered or needs_review."""
    return all(concept.status in TERMINAL_STATUSES for concept in state.concepts)


def public_question(question: Dict[str, Any]) -> Dict[str, Any]:
    """Strips the answer key and explanation fields from a stored question."""
    return {
        "question_id": question.get("id"),
        "concept": question.get("concept"),
        "angle": question.get("angle"),
        "question": question.get("question"),
        "options": question.get("options", []),
    }


def _public_history(history: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    rows = []
    for entry in history:
        question = entry.get("question") or {}
        rows.append(
            {
                "question": public_question(question),
                "choice": entry.get("choice"),
                "correct": entry.get("correct"),
                "confident": entry.get("confident"),
                "reasoning": entry.get("reasoning", ""),
                "time": entry.get("time"),
                "uncertain": entry.get("uncertain", False),
                "chosen_misconception": entry.get("chosen_misconception", ""),
                "why_wrong": entry.get("why_wrong", ""),
            }
        )
    return rows


def public_quiz(state: QuizState) -> Dict[str, Any]:
    """Returns the client-safe quiz shape (no answer keys)."""
    pending = (
        public_question(state.current_question)
        if state.current_question is not None
        else None
    )
    return {
        "quiz_id": state.quiz_id,
        "kb_id": state.kb_id,
        "kb_name": kb_name(state.kb_id),
        "concepts": [concept.model_dump() for concept in state.concepts],
        "history": _public_history(state.history),
        "current_concept": state.current_concept,
        "current_question": pending,
        "created_at": state.created_at,
        "finished": is_finished(state),
        "progress": _progress(state),
    }


def list_quizzes(owner_id: str) -> List[Dict[str, Any]]:
    """Lists the current user's quizzes with kb name and progress."""
    owner = str(owner_id)
    if not os.path.isdir(QUIZZES_DIR):
        return []
    rows: List[Dict[str, Any]] = []
    for name in os.listdir(QUIZZES_DIR):
        if not name.endswith(".json"):
            continue
        raw = _read_json(os.path.join(QUIZZES_DIR, name), None)
        if not isinstance(raw, dict) or str(raw.get("owner_id")) != owner:
            continue
        try:
            state = QuizState(**raw)
        except Exception:
            continue
        progress = _progress(state)
        rows.append(
            {
                "quiz_id": state.quiz_id,
                "kb_id": state.kb_id,
                "kb_name": kb_name(state.kb_id),
                "created_at": state.created_at,
                "current_concept": state.current_concept,
                "finished": is_finished(state),
                **progress,
            }
        )
    rows.sort(key=lambda row: row.get("created_at") or "", reverse=True)
    return rows


SIMILARITY_THRESHOLD = 0.6


def _load_misconceptions(kb_id: str) -> List[Dict[str, Any]]:
    """Loads the knowledge base's misconception repository."""
    raw = _read_json(os.path.join(KNOWLEDGE_DIR, kb_id, "misconceptions.json"), [])
    return [item for item in raw if isinstance(item, dict)] if isinstance(raw, list) else []


def _history_for_concept(state: QuizState, concept: str) -> List[Dict[str, Any]]:
    """Returns answer-history rows for one concept."""
    return [
        entry
        for entry in state.history
        if (entry.get("question") or {}).get("concept") == concept
    ]


def _concept_misconceptions(entries: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Collects distinct chosen misconceptions with their source pages."""
    seen = set()
    rows: List[Dict[str, Any]] = []
    for entry in entries:
        text = str(entry.get("chosen_misconception") or "").strip()
        if not text:
            continue
        key = text.casefold()
        if key in seen:
            continue
        seen.add(key)
        source = (entry.get("question") or {}).get("source") or {}
        rows.append(
            {
                "misconception": text,
                "source_page": source.get("page"),
            }
        )
    return rows


def _pages_to_revisit(entries: List[Dict[str, Any]]) -> List[int]:
    """Returns sorted source pages from wrong answers."""
    pages = set()
    for entry in entries:
        if entry.get("correct") is not False:
            continue
        source = (entry.get("question") or {}).get("source") or {}
        page = source.get("page")
        if isinstance(page, int):
            pages.add(page)
        elif isinstance(page, str) and page.isdigit():
            pages.add(int(page))
    return sorted(pages)


def _concept_similarity(left: str, right: str) -> float:
    """Returns a normalised difflib similarity ratio for two concept names."""
    return difflib.SequenceMatcher(
        None,
        _normalise(left),
        _normalise(right),
    ).ratio()


def build_quiz_summary(
    state: QuizState,
    misconceptions: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """Builds per-concept mastery feedback and weak misconception ids."""
    repo = _load_misconceptions(state.kb_id) if misconceptions is None else misconceptions
    concepts = []
    for concept in state.concepts:
        entries = _history_for_concept(state, concept.name)
        hits = _concept_misconceptions(entries)
        pages = _pages_to_revisit(entries)
        attempts = len(entries)
        correct_count = sum(1 for entry in entries if entry.get("correct") is True)
        uncertain_count = sum(1 for entry in entries if entry.get("uncertain") is True)
        row = {
            "name": concept.name,
            "status": concept.status,
            "attempts": attempts,
            "correct_count": correct_count,
            "uncertain_count": uncertain_count,
            "misconceptions_hit": hits,
            "pages_to_revisit": pages,
        }
        concepts.append(row)
        step(
            "QUIZ",
            "summary concept",
            quiz_id=state.quiz_id,
            concept=concept.name,
            status=concept.status,
            attempts=attempts,
            correct_count=correct_count,
            uncertain_count=uncertain_count,
            misconceptions=len(hits),
            pages=", ".join(str(page) for page in pages) or "-",
        )

    total = len(state.concepts)
    mastered = sum(1 for concept in state.concepts if concept.status == "mastered")
    mastery_percent = round((mastered / total) * 100) if total else 0

    weak_concepts = [
        concept for concept in state.concepts if concept.status != "mastered"
    ]
    weak_ids: List[str] = []
    for concept in weak_concepts:
        for item in repo:
            item_concept = str(item.get("concept") or "")
            ratio = _concept_similarity(concept.name, item_concept)
            matched = ratio >= SIMILARITY_THRESHOLD
            step(
                "QUIZ",
                "weak misconception candidate",
                quiz_id=state.quiz_id,
                concept=concept.name,
                misconception_id=item.get("id") or "-",
                misconception_concept=item_concept or "-",
                ratio=round(ratio, 3),
                decision="matched" if matched else "skipped",
            )
            item_id = item.get("id")
            if matched and item_id and str(item_id) not in weak_ids:
                weak_ids.append(str(item_id))

    step(
        "QUIZ",
        "weak misconceptions selected",
        quiz_id=state.quiz_id,
        count=len(weak_ids),
        ids=", ".join(weak_ids) or "-",
    )
    return {
        "quiz_id": state.quiz_id,
        "kb_id": state.kb_id,
        "kb_name": kb_name(state.kb_id),
        "mastery_percent": mastery_percent,
        "concepts": concepts,
        "weak_misconception_ids": weak_ids,
    }


def _current_concept(state: QuizState) -> ConceptState:
    for concept in state.concepts:
        if concept.name == state.current_concept:
            return concept
    raise QuizStateError("Quiz has no current concept.")


def _retest_target(state: QuizState, concept: ConceptState) -> Optional[str]:
    """Returns the misconception from the latest wrong answer for this concept."""
    if not state.history:
        return None
    latest = state.history[-1]
    question = latest.get("question") or {}
    if question.get("concept") != concept.name or latest.get("correct") is not False:
        return None
    chosen = str(latest.get("chosen_misconception") or "").strip()
    if chosen:
        return chosen
    notes = question.get("option_notes") or []
    choice = latest.get("choice")
    if isinstance(choice, int) and 0 <= choice < len(notes):
        return str((notes[choice] or {}).get("misconception") or "").strip() or None
    return None


def _pick_angle(
    concept: ConceptState, target: Optional[str]
) -> tuple[str, str, bool]:
    """Picks the next unused angle, or starts a new cycle after all five."""
    unused = [angle for angle in ANGLES if angle not in concept.angles_used]
    if unused:
        angle = unused[0]
        why = "next unused angle in increasing difficulty order"
        reset = False
    else:
        angle = ANGLES[0]
        why = "all angles used; starting a new angle cycle"
        reset = True
    if target:
        why = f"{why}; re-testing the misconception from the last wrong answer"
    return angle, why, reset


def _question_is_avoided(question: str, avoid_questions: List[str]) -> bool:
    normalized = _normalise(question)
    return any(normalized == _normalise(previous) for previous in avoid_questions)


def _next_concept(state: QuizState) -> Optional[ConceptState]:
    for concept in state.concepts:
        if concept.status not in TERMINAL_STATUSES:
            return concept
    return None


def _advance_concept(state: QuizState) -> None:
    before = state.current_concept
    following = _next_concept(state)
    state.current_concept = following.name if following else None
    step(
        "STATE",
        "concept moved",
        before=before or "-",
        after=state.current_concept or "-",
    )
    if state.current_concept is None:
        decision(
            "STATE",
            "quiz finished",
            quiz_id=state.quiz_id,
            rule="every concept is mastered or needs_review",
            concepts=len(state.concepts),
        )


def build_next_question(
    state: QuizState,
    kb: Any,
    engine: Callable[..., Dict[str, Any]] = generate_question,
) -> Dict[str, Any]:
    """Generates or reuses the next question and stores it with its answer key."""
    if is_finished(state):
        raise QuizFinishedError("Quiz is finished.")
    if state.current_question is not None:
        step(
            "QUIZ",
            "pending question reused",
            quiz_id=state.quiz_id,
            question_id=state.current_question.get("id"),
            concept=state.current_concept,
        )
        result = public_question(state.current_question)
        result.update(
            {
                "concepts": [concept.model_dump() for concept in state.concepts],
                "current_concept": state.current_concept,
                "progress": _progress(state),
                "finished": False,
            }
        )
        return result

    concept = _current_concept(state)
    target = _retest_target(state, concept)
    angle, why, reset = _pick_angle(concept, target)
    step(
        "QUIZ",
        "next question",
        quiz_id=state.quiz_id,
        concept=concept.name,
        angle=angle,
        why=why,
        target_misconception=target or "-",
        streak=concept.streak,
        status=concept.status,
    )

    avoid_questions = [
        str((entry.get("question") or {}).get("question") or "")
        for entry in state.history
        if (entry.get("question") or {}).get("question")
    ]
    question: Optional[Dict[str, Any]] = None
    for duplicate_attempt in range(1, 3):
        candidate = engine(
            kb,
            concept.name,
            angle,
            avoid_questions,
            target_misconception=target,
        )
        if _question_is_avoided(candidate.get("question", ""), avoid_questions):
            step(
                "QUIZ",
                "question rejected",
                quiz_id=state.quiz_id,
                concept=concept.name,
                angle=angle,
                reason="duplicate question text",
                attempt=duplicate_attempt,
                question=" ".join(str(candidate.get("question", "")).split())[:120],
            )
            continue
        question = candidate
        break
    if question is None:
        raise QuizGenerationError(
            f"Could not generate a question that avoids previous questions for '{concept.name}'."
        )

    question = dict(question)
    question["id"] = uuid.uuid4().hex[:8]
    question["concept"] = concept.name
    question["angle"] = angle
    if reset:
        concept.angles_used = [angle]
    else:
        concept.angles_used.append(angle)
    state.current_question = question
    step(
        "QUIZ",
        "answer key stored",
        quiz_id=state.quiz_id,
        question_id=question["id"],
        concept=concept.name,
        angle=angle,
        correct_index=question.get("correct_index"),
        correct_option=(question.get("options") or [None])[
            int(question.get("correct_index", 0))
        ],
        note="server-side only",
    )
    result = public_question(question)
    result.update(
        {
            "concepts": [item.model_dump() for item in state.concepts],
            "current_concept": state.current_concept,
            "progress": _progress(state),
            "finished": False,
        }
    )
    return result


def _streak_angles(
    history: List[Dict[str, Any]], concept_name: str, streak: int
) -> List[str]:
    """Angles of the current confident-correct streak, newest first."""
    angles: List[str] = []
    for entry in reversed(history):
        question = entry.get("question") or {}
        if question.get("concept") != concept_name:
            break
        if not entry.get("correct"):
            break
        if entry.get("confident"):
            angles.append(str(question.get("angle") or ""))
        if len(angles) >= streak:
            break
    return angles


def _mastery_rule(
    state: QuizState, concept: ConceptState
) -> tuple[bool, List[str], str]:
    angles = _streak_angles(state.history, concept.name, concept.streak)
    distinct = len(set(angles)) >= 3
    applied = any(angle in MASTERY_ANGLES for angle in angles)
    passed = concept.streak >= 3 and distinct and applied
    rule = (
        f"streak>={3} and three distinct angles and at least one of "
        f"{sorted(MASTERY_ANGLES)}"
    )
    return passed, angles, rule


def submit_answer(
    state: QuizState,
    question_id: str,
    choice: int,
    confident: bool,
    reasoning: str = "",
) -> Dict[str, Any]:
    """Grades one answer in plain Python and applies all state transitions."""
    question = state.current_question
    if question is None:
        raise QuizStateError("No question is waiting for an answer.")
    if str(question.get("id")) != str(question_id):
        raise QuizStateError("question_id does not match the pending question.")
    if choice not in range(4):
        raise QuizStateError("choice must be 0, 1, 2, or 3.")

    concept = _current_concept(state)
    correct_index = int(question.get("correct_index", -1))
    correct = choice == correct_index
    notes = question.get("option_notes") or []
    chosen_note = notes[choice] if choice < len(notes) else {}
    chosen_misconception = (
        "" if correct else str(chosen_note.get("misconception") or "")
    )
    why_wrong = "" if correct else str(chosen_note.get("why_wrong") or "")
    streak_before = concept.streak
    status_before = concept.status
    wrong_before = concept.wrong_count

    step(
        "QUIZ",
        "answer received",
        quiz_id=state.quiz_id,
        question_id=question_id,
        concept=concept.name,
        angle=question.get("angle"),
        choice=choice,
        correct=correct,
        confident=confident,
        reasoning=reasoning or "-",
    )
    step(
        "QUIZ",
        "answer checked",
        question_id=question_id,
        correct_index=correct_index,
        choice=choice,
        correct=correct,
        note="server-side only",
    )

    uncertain = bool(correct and not confident)
    if correct:
        if confident:
            concept.streak += 1
        if concept.status == "new":
            concept.status = "practicing"
    else:
        concept.streak = 0
        concept.wrong_count += 1
        concept.status = "practicing"
        if chosen_misconception and chosen_misconception not in concept.misconceptions_hit:
            concept.misconceptions_hit.append(chosen_misconception)

    state.history.append(
        {
            "question": question,
            "choice": choice,
            "correct": correct,
            "confident": confident,
            "reasoning": reasoning or "",
            "time": _now(),
            "uncertain": uncertain,
            "chosen_misconception": chosen_misconception,
            "why_wrong": why_wrong,
        }
    )
    state.current_question = None

    step(
        "STATE",
        "streak change",
        concept=concept.name,
        before=streak_before,
        after=concept.streak,
        reason=(
            "correct and confident"
            if correct and confident
            else "correct but uncertain"
            if correct
            else "wrong answer resets streak"
        ),
    )

    mastered, streak_angles, mastery_rule = _mastery_rule(state, concept)
    if correct and mastered:
        concept.status = "mastered"
        decision(
            "STATE",
            "concept mastered",
            concept=concept.name,
            rule=mastery_rule,
            streak=concept.streak,
            angles=", ".join(streak_angles),
        )
    elif not correct and concept.wrong_count >= 3:
        concept.status = "needs_review"
        decision(
            "STATE",
            "concept needs review",
            concept=concept.name,
            rule="wrong_count>=3",
            wrong_count=concept.wrong_count,
        )

    if concept.status != status_before:
        step(
            "STATE",
            "status change",
            concept=concept.name,
            before=status_before,
            after=concept.status,
            streak=concept.streak,
            wrong_count_before=wrong_before,
            wrong_count_after=concept.wrong_count,
        )
    else:
        step(
            "STATE",
            "status unchanged",
            concept=concept.name,
            status=concept.status,
            streak=concept.streak,
            wrong_count=concept.wrong_count,
        )

    if concept.status in TERMINAL_STATUSES:
        _advance_concept(state)

    options = question.get("options") or []
    chosen_option = (
        str(options[choice])
        if isinstance(choice, int) and 0 <= choice < len(options)
        else ""
    )
    correct_option = (
        str(options[correct_index])
        if 0 <= correct_index < len(options)
        else ""
    )
    finished = is_finished(state)
    return {
        "correct": correct,
        "correct_index": correct_index,
        "chosen_option": chosen_option,
        "correct_option": correct_option,
        "chosen_misconception": chosen_misconception,
        "why_wrong": why_wrong,
        "explanation": question.get("explanation", ""),
        "example": question.get("example", ""),
        "source": question.get("source"),
        "concept_status": concept.status,
        "streak": concept.streak,
        "finished": finished,
        "uncertain": uncertain,
        "next_concept": state.current_concept if concept.status == "mastered" else None,
    }
