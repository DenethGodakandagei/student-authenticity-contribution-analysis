import os
import json
import uuid
import logging
from typing import Dict, Any, List, Optional, Literal
from datetime import datetime
# pyrefly: ignore [missing-import]
from pydantic import BaseModel, Field

from app.llm import BaseLLMProvider, get_llm_provider, generate_json
from app.detector import detect_misconceptions_checked
from app.config import settings
from app.demo_log import decision, step

logger = logging.getLogger(__name__)


# ============================================================================
# Pydantic State Schemas
# ============================================================================

class MisconceptionState(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8], description="Unique identifier for misconception item.")
    wrong_concept: str = Field(description="The incorrect belief or misunderstanding Nova holds.")
    correct_concept: str = Field(description="The accurate statement or concept addressing the misconception.")
    reason: str = Field(description="Pedagogical explanation for the misconception.")
    concept: str = Field(default="", description="OOP concept this misconception belongs to.")
    source_pages: List[int] = Field(default_factory=list, description="Source page numbers in the lecture PDF.")
    source_quote: str = Field(default="", description="Verbatim quote from the lecture supporting the correct concept.")
    confidence: float = Field(default=0.8, description="Nova's confidence in her wrong belief (0-1).")
    status: str = Field(default="active", description="Lifecycle: active, testing, learned, or needs_review.")
    is_corrected: bool = Field(default=False, description="Kept in sync: True only when status is 'learned'.")
    corrected_at: Optional[str] = Field(default=None, description="ISO timestamp when corrected.")
    user_explanation: Optional[str] = Field(default=None, description="The user explanation that helped Nova understand.")
    questions: List[Dict[str, str]] = Field(default_factory=list, description="Check questions generated when this misconception entered testing.")
    question_index: int = Field(default=0, description="Index of the check question Nova is asking right now.")
    attempts: List[Dict[str, Any]] = Field(default_factory=list, description="Judged answers: {question, answer, passed, feedback}.")

    def mark_learned(self, user_explanation: str) -> None:
        """Marks this misconception as learned, keeping is_corrected in sync."""
        self.status = "learned"
        self.is_corrected = True
        self.corrected_at = datetime.now().isoformat()
        self.user_explanation = user_explanation

    def current_question(self) -> Optional[Dict[str, str]]:
        """Returns the question Nova is asking right now, or None if there is none."""
        if 0 <= self.question_index < len(self.questions):
            return self.questions[self.question_index]
        return None


class NovaState(BaseModel):
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="Unique session ID.")
    topic: str = Field(description="The topic of the teaching session.")
    name: str = Field(default="Nova", description="Nova's student name.")
    level: str = Field(default="beginner", description="Nova's learning level.")
    behaviour: str = Field(
        default="Asks a short follow-up question and pushes back once before accepting an explanation",
        description="How Nova behaves during teaching.",
    )
    kb_id: str = Field(default="", description="Knowledge base id this session was created from.")
    owner_id: str = Field(default="", description="User id that owns this session; empty means legacy/unowned.")
    learning_objectives: List[str] = Field(default_factory=list, description="Learning objectives.")
    misconceptions: List[MisconceptionState] = Field(default_factory=list, description="Misconceptions and correction states.")
    conversation_history: List[Dict[str, str]] = Field(default_factory=list, description="Chat message history.")
    events: List[Dict[str, Any]] = Field(default_factory=list, description="Timestamped interaction event log.")
    tests: Dict[str, Any] = Field(
        default_factory=dict,
        description="Pre/post test records keyed by form: {questions, answers, score, submitted_at}.",
    )
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now().isoformat())


# ============================================================================
# LLM Output Schemas (JSON mode, validated with Pydantic)
# ============================================================================

class MisconceptionCheckItem(BaseModel):
    """Verdict for ONE active misconception from the concept-targeted correction check."""
    id: str = Field(description="Id of the active misconception being evaluated.")
    addressed: bool = Field(description="True only when the message is actually about this misconception's concept.")
    quality: Literal["clear", "vague", "wrong"] = Field(description="clear = correct and complete, vague = partial/fuzzy, wrong = incorrect.")


class CorrectionCheckOutput(BaseModel):
    """Correction check result: one entry per active misconception."""
    results: List[MisconceptionCheckItem]


class CheckQuestion(BaseModel):
    """One adaptive check question with its expected answer."""
    question: str
    expected_answer: str


class QuestionBankOutput(BaseModel):
    """The three check questions generated when a misconception enters testing."""
    questions: List[CheckQuestion]


class AnswerVerdict(BaseModel):
    """Judgement of the student's answer to the current check question."""
    passed: bool = Field(description="True only when the answer itself is correct.")
    reasoning_ok: bool = Field(description="True only when the reasoning behind the answer is sound.")
    feedback: str = Field(description="One short sentence of feedback for the tutor.")


# ============================================================================
# Understanding Summary (Stage 7-8 progress report)
# ============================================================================

_SCORE_BY_TRY = {1: 1.0, 2: 0.67, 3: 0.33}


def understanding_summary(state: Any) -> Dict[str, Any]:
    """
    Builds a per-concept understanding summary for a Nova state (object or dict).

    For every misconception: concept, status, tries (judged answers), score
    (1.0 first try, 0.67 second, 0.33 third, 0.0 later; null when never tested)
    and source_pages. `overall_score` is the average over tested concepts, or
    null when nothing has been tested yet.
    """
    if isinstance(state, dict):
        items = state.get("misconceptions", []) or []
    else:
        items = [m.model_dump() for m in state.misconceptions]

    rows: List[Dict[str, Any]] = []
    tested_scores: List[float] = []

    for item in items:
        attempts = item.get("attempts") or []
        tries = len(attempts)
        score = None
        if tries:
            passed_try = next((i + 1 for i, a in enumerate(attempts) if a.get("passed")), None)
            score = _SCORE_BY_TRY.get(passed_try, 0.0)
            tested_scores.append(score)
        status = item.get("status")
        if not status:
            status = "learned" if item.get("is_corrected") else "active"
        rows.append({
            "concept": item.get("concept", ""),
            "status": status,
            "tries": tries,
            "score": score,
            "source_pages": item.get("source_pages", []) or [],
        })

    overall = sum(tested_scores) / len(tested_scores) if tested_scores else None
    return {"misconceptions": rows, "overall_score": overall}


# ============================================================================
# Nova AI Student Agent
# ============================================================================

class NovaStudentAgent:
    """
    Nova: An AI Student Agent that:
    - Starts with student misconceptions generated by Atlas.
    - Responds to teacher questions based on uncorrected misconceptions.
    - Evaluates teacher explanations and updates its understanding (is_corrected=True).
    - Supports saving and loading session states to/from JSON.
    """

    def __init__(self, state: NovaState, provider: Optional[BaseLLMProvider] = None):
        self.state = state
        self.provider = provider or get_llm_provider()

    @classmethod
    def from_atlas_output(cls, atlas_data: Dict[str, Any], session_id: Optional[str] = None, provider: Optional[BaseLLMProvider] = None) -> "NovaStudentAgent":
        """
        Factory method to initialize Nova from Atlas misconception output.
        """
        topic = atlas_data.get("topic", "General Topic")
        objectives = atlas_data.get("learning_objectives", [])
        raw_misconceptions = atlas_data.get("misconceptions", [])

        misconception_states = []
        for item in raw_misconceptions:
            c_name = item.get("concept") or item.get("topic") or topic
            misconception_states.append(
                MisconceptionState(
                    concept=str(c_name),
                    wrong_concept=item.get("wrong_concept") or item.get("misconception") or "",
                    correct_concept=item.get("correct_concept") or item.get("correct_explanation") or "",
                    reason=item.get("reason") or item.get("explanation") or ""
                )
            )

        new_state = NovaState(
            session_id=session_id or str(uuid.uuid4()),
            topic=topic,
            learning_objectives=objectives,
            misconceptions=misconception_states
        )
        return cls(state=new_state, provider=provider)

    @classmethod
    def from_repository(
        cls,
        kb_id: str,
        misconception_ids: Optional[List[str]] = None,
        count: int = 2,
        provider: Optional[BaseLLMProvider] = None,
    ) -> "NovaStudentAgent":
        """
        Creates a Nova session from backend/knowledge/{kb_id}/misconceptions.json.

        If misconception_ids is given, those items are used. Otherwise `count`
        items are picked from DIFFERENT concepts.
        """
        from app.ingest import KNOWLEDGE_DIR

        repo_path = os.path.join(KNOWLEDGE_DIR, kb_id, "misconceptions.json")
        if not os.path.exists(repo_path):
            raise FileNotFoundError(f"Misconception repository not found at: {repo_path}")
        with open(repo_path, "r", encoding="utf-8") as f:
            repo = json.load(f)

        if misconception_ids:
            wanted = set(misconception_ids)
            chosen = [item for item in repo if item.get("id") in wanted]
            found_ids = {item.get("id") for item in chosen}
            missing = wanted - found_ids
            if missing:
                raise ValueError(f"Misconception ids not found in repository '{kb_id}': {sorted(missing)}")
        else:
            # Pick `count` items, each from a different concept.
            chosen = []
            seen_concepts: set = set()
            for item in repo:
                concept = item.get("concept", "")
                if concept in seen_concepts:
                    continue
                seen_concepts.add(concept)
                chosen.append(item)
                if len(chosen) >= count:
                    break

        misconception_states = [
            MisconceptionState(
                id=item.get("id", str(uuid.uuid4())[:8]),
                concept=item.get("concept", ""),
                wrong_concept=item.get("wrong_belief", ""),
                correct_concept=item.get("correct_concept", ""),
                reason=item.get("reason", ""),
                source_pages=item.get("source_pages", []),
                source_quote=item.get("source_quote", ""),
                confidence=0.8,
                status="active",
            )
            for item in chosen
        ]

        new_state = NovaState(
            session_id=str(uuid.uuid4()),
            topic="Object Oriented Programming",
            kb_id=kb_id,
            misconceptions=misconception_states,
        )
        return cls(state=new_state, provider=provider)

    # ------------------------------------------------------------------------
    # State Persistence (Save & Load)
    # ------------------------------------------------------------------------

    def to_dict(self) -> Dict[str, Any]:
        """Serializes current state to dictionary."""
        return self.state.model_dump()

    def to_public_dict(self) -> Dict[str, Any]:
        """
        Serializes the state for API responses, hiding answer keys and explanations
        for every test form that has not been submitted yet.
        """
        data = self.to_dict()
        for test in (data.get("tests") or {}).values():
            if not isinstance(test, dict) or test.get("submitted_at"):
                continue
            for question in test.get("questions") or []:
                if isinstance(question, dict):
                    question.pop("correct_index", None)
                    question.pop("explanation", None)
        return data

    @classmethod
    def from_dict(cls, state_dict: Dict[str, Any], provider: Optional[BaseLLMProvider] = None) -> "NovaStudentAgent":
        """Deserializes dictionary into NovaStudentAgent instance."""
        state = NovaState(**state_dict)
        # Backward compatibility: legacy sessions have is_corrected but no status.
        for m in state.misconceptions:
            if m.is_corrected and m.status != "learned":
                m.status = "learned"
            m.is_corrected = m.status == "learned"
        return cls(state=state, provider=provider)

    def save_state(self, filepath: str) -> None:
        """Saves Nova's session state to a JSON file."""
        self.state.updated_at = datetime.now().isoformat()
        os.makedirs(os.path.dirname(os.path.abspath(filepath)), exist_ok=True)
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(self.to_dict(), f, indent=2)
        logger.info(f"Nova session state saved to {filepath}")

    @classmethod
    def load_state(cls, filepath: str, provider: Optional[BaseLLMProvider] = None) -> "NovaStudentAgent":
        """Loads Nova instance from a JSON state file."""
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"Nova state file not found at: {filepath}")
        with open(filepath, "r", encoding="utf-8") as f:
            state_dict = json.load(f)
        logger.info(f"Nova session state loaded from {filepath}")
        return cls.from_dict(state_dict, provider=provider)

    # ------------------------------------------------------------------------
    # Prompt Construction
    # ------------------------------------------------------------------------

    def _build_student_persona_prompt(self, user_message: str, situation: Optional[str] = None) -> str:
        """
        Builds the prompt instructing the LLM to act as Nova, the student.

        Nova receives ONLY her wrong beliefs, their confidence, her behaviour,
        her level, the last 6 messages, and the concepts she has learned.
        correct_concept is NEVER revealed for an active misconception.

        `situation` (optional) tells her what is happening this turn, e.g. that
        she must ask the current check question word for word.
        """
        active = [m for m in self.state.misconceptions if m.status != "learned"]
        learned = [m for m in self.state.misconceptions if m.status == "learned"]

        beliefs_str = "\n".join([
            f"- About {m.concept or 'this topic'}: I believe \"{m.wrong_concept}\" "
            f"(confidence {m.confidence:.1f})"
            for m in active
        ]) if active else "None - I have learned everything."

        learned_str = "\n".join([
            f"- {m.concept or 'Concept'}: {m.correct_concept}"
            for m in learned
        ]) if learned else "None yet."

        history_str = "\n".join([
            f"{msg['role'].capitalize()}: {msg['content']}"
            for msg in self.state.conversation_history[-6:]
        ]) if self.state.conversation_history else "No previous conversation."

        situation_block = ""
        if situation:
            situation_block = f"""
WHAT IS HAPPENING RIGHT NOW (follow this first; it overrides the general rules below if they clash):
{situation}
"""

        return f"""
You are {self.state.name}, a {self.state.level} student learning about "{self.state.topic}".

YOUR LEVEL: {self.state.level}
YOUR BEHAVIOUR: {self.state.behaviour}

MY CURRENT BELIEFS (things I believe are TRUE right now):
{beliefs_str}

CONCEPTS I HAVE ALREADY LEARNED:
{learned_str}

LAST 6 MESSAGES:
{history_str}

MESSAGE JUST SENT TO YOU:
"{user_message}"
{situation_block}
INSTRUCTIONS FOR NOVA:
1. Reply in plain text only: 2-3 sentences, first person, no quotation marks around your reply,
   no placeholders like [Your Name].
2. Talk directly to the person you are replying to and use "you" for them. Never say
   "the teacher" or "the student", and never describe yourself in the third person.
3. First, react directly to the other person's latest message in your own words: repeat the idea back,
   ask a question about it, or say what is confusing about it.
4. Only after that, if you still hold other active beliefs, you may briefly mention one of them.
5. If the other person's message is short, vague, or only partly correct, push back politely instead
   of accepting it, based on your current beliefs.
6. If the message is about a concept you have a belief about (listed under MY CURRENT BELIEFS above),
   you MUST apply that belief in one short sentence or a tiny example right after reacting, for example
   "so I would write ...". Use MY CURRENT BELIEFS, not the correct facts. Never say the correct answer
   for a belief you still hold; only CONCEPTS I HAVE ALREADY LEARNED may be stated correctly.
7. When the other person clearly and fully corrects one of your beliefs, show a realistic moment
   of understanding and restate the corrected idea in your own words.
8. If WHAT IS HAPPENING RIGHT NOW gives you a question to ask, ask that question word for word.

Respond as Nova now:
"""

    # ------------------------------------------------------------------------
    # Knowledge State Tracking & Query Methods
    # ------------------------------------------------------------------------

    def get_unresolved_misconceptions(self) -> List[Dict[str, Any]]:
        """Returns list of misconceptions Nova currently still holds (unresolved)."""
        return [
            m.model_dump() for m in self.state.misconceptions if not m.is_corrected
        ]

    def get_learned_misconceptions(self) -> List[Dict[str, Any]]:
        """Returns list of misconceptions Nova has successfully learned and corrected."""
        return [
            m.model_dump() for m in self.state.misconceptions if m.is_corrected
        ]

    def _build_correction_check_prompt(self, user_message: str) -> str:
        """
        Builds the concept-targeted correction check prompt.

        It carries the student's latest message plus every ACTIVE misconception
        (id, concept, wrong_belief, correct_concept) so the evaluator can grade
        each concept on its own: addressed (is the message about that concept?)
        and quality (clear / vague / wrong).
        """
        active = [m for m in self.state.misconceptions if m.status == "active"]
        items_json = json.dumps([
            {
                "id": m.id,
                "concept": m.concept,
                "wrong_belief": m.wrong_concept,
                "correct_concept": m.correct_concept,
            }
            for m in active
        ], indent=2)

        return f"""
You are an expert pedagogical evaluator.
A student is teaching Nova. For EACH active misconception below, decide whether the student's
latest message actually addresses that misconception's concept, and how good that explanation is.

ACTIVE MISCONCEPTIONS TO EVALUATE:
{items_json}

THE STUDENT'S LATEST MESSAGE:
"{user_message}"

EVALUATION RULES:
1. "addressed" may be true ONLY when the message is really about that misconception's concept.
   A message about some other concept must get "addressed": false.
2. "quality" grades the explanation for that misconception:
   - "clear": correct, specific and complete enough to fix the misconception;
   - "vague": the right idea but short, fuzzy, partial or only partly correct;
   - "wrong": incorrect or contradicting the correct_concept.
3. When "addressed" is false, always return "quality": "vague".
4. Return one entry per active id, exactly once, and use the given ids verbatim.

Return ONLY valid JSON:
{{
  "results": [{{"id": "id_here", "addressed": true, "quality": "clear"}}]
}}
"""

    def _build_question_bank_prompt(self, m: MisconceptionState, avoid_wording: str = "") -> str:
        """
        Builds the prompt that generates the 3 check questions for a misconception
        that has just entered testing. Only the source quote and the correct
        concept are used as the source of truth.

        The questions are "what would happen if..." scenario questions built on a
        NEW example the teacher did not use, so the first question cannot be
        answered by repeating the teacher's last message.
        """
        avoid_block = f"""
THE TEACHER'S LAST MESSAGE (do NOT reuse its example or wording in your questions):
"{avoid_wording}"
""" if avoid_wording else ""

        return f"""
You write check questions for a tutor who is teaching Nova.
Write EXACTLY 3 check questions for the misconception below. All 3 must test the SAME concept
and must be DIFFERENT from each other:
  1. a "what would happen if..." scenario question built on a NEW concrete example that the
     teacher never mentioned (for example a different class/object than the teacher used),
  2. another "what would happen if..." scenario question built on a DIFFERENT new example,
  3. a "which statement is true" question.
The FIRST question must not be answerable by repeating or paraphrasing the teacher's last message:
the student has to apply the concept to the new example instead.
Use ONLY the source quote and the correct concept below as the source of truth; invent nothing.
Each question must be answerable from the source quote, and each expected_answer must be a short
correct answer taken from the source quote.
{avoid_block}
CONCEPT: {m.concept}
NOVA'S WRONG BELIEF: {m.wrong_concept}
CORRECT CONCEPT: {m.correct_concept}
LECTURE SOURCE QUOTE: {m.source_quote}
LECTURE PAGE(S): {", ".join(str(p) for p in m.source_pages) or "unknown"}

Return ONLY valid JSON:
{{
  "questions": [
    {{"question": "...", "expected_answer": "..."}},
    {{"question": "...", "expected_answer": "..."}},
    {{"question": "...", "expected_answer": "..."}}
  ]
}}
"""

    def _build_answer_judgement_prompt(
        self, m: MisconceptionState, question: Dict[str, str], answer: str
    ) -> str:
        """
        Builds the prompt that judges the student's answer to the current check
        question against the expected answer and the lecture source quote.
        """
        return f"""
You judge a student's answer to a check question about the concept "{m.concept}".

CHECK QUESTION:
{question["question"]}

EXPECTED ANSWER (from the lecture):
{question["expected_answer"]}

LECTURE SOURCE QUOTE (source of truth):
{m.source_quote}

THE STUDENT'S ANSWER:
"{answer}"

RULES:
- "passed" is true only when the answer itself is correct against the expected answer.
- "reasoning_ok" is true only when the reasoning behind the answer is sound, not a lucky guess.
- The answer counts as correct ONLY when both passed and reasoning_ok are true.
- "feedback" is one short sentence for the tutor.

Return ONLY valid JSON:
{{"passed": true, "reasoning_ok": true, "feedback": "one short sentence"}}
"""

    # ------------------------------------------------------------------------
    # Event Log
    # ------------------------------------------------------------------------

    def _log_event(self, event: Dict[str, Any]) -> None:
        """Appends a timestamped event to state.events (capped at 500)."""
        event = {"time": datetime.now().isoformat(), **event}
        self.state.events.append(event)
        if len(self.state.events) > 500:
            del self.state.events[: len(self.state.events) - 500]

    # ------------------------------------------------------------------------
    # Adaptive Question Gate (Stages 7-8)
    # ------------------------------------------------------------------------

    def _empty_outcome(self) -> Dict[str, Any]:
        """Default per-turn outcome: no gate action, no question, no feedback."""
        return {
            "situation": None,
            "required": None,
            "fallback": None,
            "check_result": None,
            "check_feedback": None,
            "check_question": None,
            "newly_corrected_ids": [],
        }

    def _start_testing(self, m: MisconceptionState, user_message: str) -> bool:
        """
        Moves one misconception into "testing" and generates its 3 check questions.

        Returns False (leaving the state untouched) when no usable question could
        be generated. Only one misconception may be in "testing" at a time.
        """
        try:
            bank = generate_json(
                self._build_question_bank_prompt(m, avoid_wording=user_message),
                QuestionBankOutput,
                provider=self.provider,
                retries=1,
            )
            questions = [
                {"question": q.question.strip(), "expected_answer": q.expected_answer.strip()}
                for q in bank.questions
                if q.question.strip()
            ][:3]
            if not questions:
                raise ValueError("No usable question was generated.")
            if len(questions) < 3:
                logger.warning(f"Only {len(questions)} check questions generated for [{m.id}] (3 requested).")
        except Exception as e:
            logger.warning(f"Question generation failed for misconception [{m.id}] (status unchanged): {e}")
            self._log_event({"type": "question_asked", "id": m.id, "error": str(e)})
            return False

        previous_status = m.status
        m.questions = questions
        m.question_index = 0
        m.attempts = []
        m.status = "testing"
        # When student gives a clear explanation, Nova's confidence in her misconception drops
        m.confidence = round(max(0.2, m.confidence * 0.6), 2)
        decision(
            "STATE",
            "status change",
            id=m.id,
            concept=m.concept,
            previous=previous_status,
            status="testing",
        )
        self._log_event({"type": "status_change", "id": m.id, "from": previous_status, "to": "testing"})
        self._log_event({
            "type": "question_asked",
            "id": m.id,
            "index": 0,
            "question": questions[0]["question"],
            "questions": [q["question"] for q in questions],
        })
        logger.info(f"Nova misconception [{m.id}] moved to testing; asking: {questions[0]['question']}")
        decision(
            "NOVA",
            "check question asked",
            id=m.id,
            index=0,
            question=questions[0]["question"],
        )
        return True

    def _handle_teaching_message(self, user_message: str) -> Dict[str, Any]:
        """
        Runs the concept-targeted correction check on the student's teaching message.

        Only addressed=true AND quality="clear" moves a misconception from "active"
        to "testing" (and it never goes straight to "learned"). Vague or wrong
        explanations change nothing; a failed JSON call changes nothing too.
        """
        outcome = self._empty_outcome()
        active = [m for m in self.state.misconceptions if m.status == "active"]

        if not active:
            self._log_event({"type": "check_result", "results": [], "message": user_message})
            return outcome

        try:
            check = generate_json(
                self._build_correction_check_prompt(user_message),
                CorrectionCheckOutput,
                provider=self.provider,
                retries=1,
            )
            results = [item.model_dump() for item in check.results]
        except Exception as e:
            logger.warning(f"Correction check failed (no state change): {e}")
            self._log_event({"type": "check_result", "results": [], "error": str(e), "message": user_message})
            return outcome

        self._log_event({"type": "check_result", "results": results, "message": user_message})

        by_id = {m.id: m for m in self.state.misconceptions}
        for item in results:
            decision(
                "NOVA",
                "correction check",
                id=item.get("id", ""),
                addressed=item.get("addressed"),
                quality=item.get("quality"),
            )
            m = by_id.get(item.get("id", ""))
            if m is None or m.status != "active":
                continue
            if not item.get("addressed") or item.get("quality") != "clear":
                continue
            if self._start_testing(m, user_message):
                question = m.current_question()["question"]
                outcome["situation"] = (
                    "The student just gave you a clear explanation of something you used to have wrong. "
                    "Thank them for the explanation in your own words, then ask this check question "
                    f"word for word: \"{question}\""
                )
                outcome["required"] = question
                outcome["fallback"] = f"Thank you, that helps! I want to be sure I really get it: {question}"
                outcome["check_question"] = question
                break  # only ONE misconception may be in testing at a time; the others wait.
        return outcome

    def _handle_answer_message(self, answer: str, m: MisconceptionState) -> Dict[str, Any]:
        """
        Treats the student's message as the ANSWER to the misconception' current
        check question (the message is NOT new teaching) and advances the gate.
        """
        outcome = self._empty_outcome()
        question = m.current_question()
        if question is None:
            # Nothing to judge (defensive): fall back to normal teaching behaviour.
            return self._handle_teaching_message(answer)

        try:
            verdict = generate_json(
                self._build_answer_judgement_prompt(m, question, answer),
                AnswerVerdict,
                provider=self.provider,
                retries=1,
            )
        except Exception as e:
            logger.warning(f"Answer judgement failed (no state change): {e}")
            self._log_event({
                "type": "answer_judged",
                "id": m.id,
                "question": question["question"],
                "answer": answer,
                "passed": False,
                "error": str(e),
            })
            outcome["situation"] = (
                "You could not evaluate that answer, so ask the SAME check question again "
                f"word for word: \"{question['question']}\""
            )
            outcome["required"] = question["question"]
            outcome["fallback"] = f"Sorry, I did not quite follow that. Let me ask you again: {question['question']}"
            outcome["check_question"] = question["question"]
            return outcome

        passed = bool(verdict.passed) and bool(verdict.reasoning_ok)
        decision(
            "NOVA",
            "answer judged",
            id=m.id,
            question=question["question"],
            passed=passed,
            reasoning_ok=bool(verdict.reasoning_ok),
        )
        m.attempts.append({
            "question": question["question"],
            "answer": answer,
            "passed": passed,
            "feedback": verdict.feedback,
        })
        self._log_event({
            "type": "answer_judged",
            "id": m.id,
            "question": question["question"],
            "answer": answer,
            "passed": passed,
            "reasoning_ok": bool(verdict.reasoning_ok),
            "feedback": verdict.feedback,
        })
        outcome["check_feedback"] = verdict.feedback

        if passed:
            # The ONLY path that can ever mark a misconception learned.
            previous_status = m.status
            m.mark_learned(answer)
            m.confidence = round(m.confidence * 0.5, 2)
            decision(
                "STATE",
                "status change",
                id=m.id,
                concept=m.concept,
                previous=previous_status,
                status="learned",
            )
            self._log_event({"type": "status_change", "id": m.id, "from": previous_status, "to": "learned"})
            logger.info(f"Nova learned concept [{m.id}] after a passed answer.")
            outcome["check_result"] = "passed"
            outcome["newly_corrected_ids"] = [m.id]
            outcome["situation"] = (
                "You have just understood the correct idea. In 1-2 sentences, confirm that you now "
                "understand and restate the corrected idea in your own words. Do NOT ask any new "
                "question and do not express confusion - just show that you get it."
            )
            return outcome

        if m.question_index + 1 < len(m.questions):
            # Not the last question: move on to the NEXT different question.
            m.question_index += 1
            nxt = m.current_question()
            decision(
                "NOVA",
                "check question asked",
                id=m.id,
                index=m.question_index,
                question=nxt["question"],
            )
            self._log_event({
                "type": "question_asked",
                "id": m.id,
                "index": m.question_index,
                "question": nxt["question"],
                "questions": [q["question"] for q in m.questions],
            })
            outcome["check_result"] = "failed"
            outcome["check_question"] = nxt["question"]
            outcome["situation"] = (
                "The student's answer was not right. Say that you are still not sure, then ask this "
                f"next check question word for word: \"{nxt['question']}\""
            )
            outcome["required"] = nxt["question"]
            outcome["fallback"] = f"Sorry, I am still not sure about that. Let me ask a different question: {nxt['question']}"
            return outcome

        # Failed the last question: send it for human review, no more questions.
        previous_status = m.status
        m.status = "needs_review"
        m.is_corrected = False
        decision(
            "STATE",
            "status change",
            id=m.id,
            concept=m.concept,
            previous=previous_status,
            status="needs_review",
        )
        self._log_event({"type": "status_change", "id": m.id, "from": previous_status, "to": "needs_review"})
        logger.info(f"Nova misconception [{m.id}] needs review after {len(m.attempts)} failed attempts.")
        outcome["check_result"] = "needs_review"

        page = m.source_pages[0] if m.source_pages else None
        quote = m.source_quote or m.correct_concept
        page_hint = f" page {page} of the lecture" if page is not None else " the lecture"
        outcome["situation"] = (
            "The student could not get it right after three tries. In 2-3 sentences, tell the student "
            f"the correct idea in simple words using this lecture quote: \"{quote}\" and say they should "
            f"check{page_hint}."
        )
        if page is not None:
            outcome["required"] = str(page)
        outcome["fallback"] = (
            f"I don't think I have this right yet. The lecture says: {quote} "
            f"Please check{page_hint} and we can try again later."
        )
        return outcome

    def get_learning_progress(self) -> Dict[str, Any]:
        """
        Calculates and returns Nova's learning progress statistics:
        - total_misconceptions
        - corrected_misconceptions
        - remaining_misconceptions
        - learning_percentage
        """
        total = len(self.state.misconceptions)
        corrected = sum(1 for m in self.state.misconceptions if m.is_corrected)
        remaining = total - corrected
        percentage = round((corrected / total * 100.0), 2) if total > 0 else 0.0

        return {
            "total_misconceptions": total,
            "corrected_misconceptions": corrected,
            "remaining_misconceptions": remaining,
            "learning_percentage": percentage
        }

    def respond(self, user_message: str) -> Dict[str, Any]:
        """
        Main interaction method (adaptive question gate + misconception detection):
        1. If a misconception is being tested, the message is judged as the ANSWER
           to the current check question (pass / fail / needs_review).
        2. Otherwise the message is teaching: the concept-targeted correction check
           decides whether a misconception moves from active to testing.
        3. Generates Nova's in-character reply (including the check question to ask).
        4. When the reply is not a check question, the Stage 6 detector checks
           whether any still-held misconception remains in her reply (read-only).
        5. Appends the turn to the history and returns progress + gate fields.
        """
        if not user_message or not user_message.strip():
            raise ValueError("User message cannot be empty.")

        # Step 1: advance the gate (answer mode OR teaching mode, never both).
        self._log_event({"type": "teacher_message", "text": user_message})
        testing = [m for m in self.state.misconceptions if m.status == "testing"]
        if testing:
            decision("NOVA", "turn mode", mode="answer", testing_id=testing[0].id)
            outcome = self._handle_answer_message(user_message, testing[0])
        else:
            decision("NOVA", "turn mode", mode="teaching")
            outcome = self._handle_teaching_message(user_message)

        # Step 2: Generate Nova's response in character.
        prompt = self._build_student_persona_prompt(user_message, situation=outcome["situation"])
        raw_response = self.provider.generate(prompt, json_mode=False).strip()
        required = outcome.get("required")
        if required and required.lower() not in raw_response.lower():
            # The model dropped the question / lecture page: keep the turn usable.
            raw_response = outcome["fallback"]
        step(
            "NOVA",
            "reply generated",
            chars=len(raw_response),
            preview=raw_response[:150],
        )

        # Step 3: Append to history and event log
        self.state.conversation_history.append({"role": "teacher", "content": user_message})
        self.state.conversation_history.append({"role": "nova", "content": raw_response})
        self._log_event({"type": "nova_reply", "text": raw_response})

        # Step 4: Stage 6 - Misconception Detection on Nova's reply (read-only).
        # Runs only when the reply is NOT a check question and at least one
        # misconception is still active; it never changes any status.
        detection: List[Dict[str, Any]] = []
        hold = [m for m in self.state.misconceptions if m.status in ("active", "testing")]
        if not outcome.get("check_question") and any(m.status == "active" for m in hold):
            targets = [
                {"id": m.id, "concept": m.concept, "wrong_belief": m.wrong_concept,
                 "correct_concept": m.correct_concept}
                for m in hold
            ]
            try:
                detection, detection_error = detect_misconceptions_checked(
                    raw_response, user_message, targets, provider=self.provider
                )
            except Exception as e:  # defensive: detection must never break a turn
                detection_error = str(e)
                detection = [
                    {"id": t["id"], "still_present": True, "evidence": "", "confidence": 0.0}
                    for t in targets
                ]
            if detection_error:
                self._log_event({"type": "detector_error", "error": detection_error})
            for verdict in detection:
                decision(
                    "NOVA",
                    "detector verdict",
                    id=verdict.get("id", ""),
                    still_present=verdict.get("still_present"),
                    confidence=verdict.get("confidence"),
                    evidence=str(verdict.get("evidence", ""))[:120],
                )
            self._log_event({"type": "detection", "results": detection})

        self.state.updated_at = datetime.now().isoformat()

        unresolved = self.get_unresolved_misconceptions()
        learned = self.get_learned_misconceptions()
        progress = self.get_learning_progress()

        return {
            "session_id": self.state.session_id,
            "nova_response": raw_response,
            "newly_corrected_ids": outcome["newly_corrected_ids"],
            "learning_progress": progress,
            "unresolved_misconceptions_count": len(unresolved),
            "learned_misconceptions_count": len(learned),
            "unresolved_misconceptions": unresolved,
            "learned_misconceptions": learned,
            "check_question": outcome["check_question"],
            "check_result": outcome["check_result"],
            "check_feedback": outcome["check_feedback"],
            "understanding": understanding_summary(self.state),
            "detection": detection,
            "state": self.to_public_dict()
        }


