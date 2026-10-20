"""Tests for the adaptive quiz session state machine (stubbed quiz engine).

Covers streak rules, uncertain correct answers, wrong-answer re-test targeting,
mastery after three angles, needs_review after three wrong answers, and the
answer-key-free next-question payload.

Run: python test_quiz_session.py
"""
import json
import os
import shutil
import sys
import tempfile
from typing import Any, Dict, List

os.environ["DEMO_LOG"] = "1"

backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

from app import quiz_session
from app.quiz_session import (
    build_next_question,
    create_quiz_state,
    load_quiz,
    public_quiz,
    save_quiz,
    submit_answer,
)

KB_ID = "quizkb"


class StubEngine:
    def __init__(self):
        self.calls: List[Dict[str, Any]] = []
        self.counter = 0

    def __call__(
        self,
        kb: Any,
        concept: str,
        angle: str,
        avoid_questions: List[str],
        target_misconception: str | None = None,
    ) -> Dict[str, Any]:
        self.counter += 1
        self.calls.append(
            {
                "concept": concept,
                "angle": angle,
                "avoid": list(avoid_questions),
                "target": target_misconception,
            }
        )
        number = self.counter
        return {
            "angle": angle,
            "question": f"Question {number} for {concept} ({angle})",
            "options": [
                "Correct answer",
                f"Wrong answer A{number}",
                f"Wrong answer B{number}",
                f"Wrong answer C{number}",
            ],
            "correct_index": 0,
            "option_notes": [
                {"misconception": "", "why_wrong": ""},
                {
                    "misconception": f"Misconception from option A{number}",
                    "why_wrong": "Because A is wrong.",
                },
                {
                    "misconception": f"Misconception from option B{number}",
                    "why_wrong": "Because B is wrong.",
                },
                {
                    "misconception": f"Misconception from option C{number}",
                    "why_wrong": "Because C is wrong.",
                },
            ],
            "explanation": "The first option is correct.",
            "example": "example()",
            "source_chunk_id": "p1_c0",
            "source_quote": "A grounded source quote.",
            "source": {
                "page": 1,
                "line_start": 2,
                "line_end": 2,
                "quote": "A grounded source quote.",
            },
        }


def _setup_temp_kb() -> tuple[str, str]:
    root = tempfile.mkdtemp(prefix="nova-quiz-session-test-")
    knowledge = os.path.join(root, "knowledge")
    quizzes = os.path.join(root, "quizzes")
    kb_dir = os.path.join(knowledge, KB_ID)
    os.makedirs(kb_dir)
    os.makedirs(quizzes)
    with open(os.path.join(kb_dir, "concepts.json"), "w", encoding="utf-8") as handle:
        json.dump(["class and object", "constructor", "inheritance"], handle)
    quiz_session.KNOWLEDGE_DIR = knowledge
    quiz_session.QUIZZES_DIR = quizzes
    return root, knowledge


def _assert_no_answer_key(question: Dict[str, Any]) -> None:
    for key in ("correct_index", "option_notes", "explanation", "example", "source"):
        assert key not in question, f"next question leaked {key}"


def test_mastery_and_advance():
    root, knowledge = _setup_temp_kb()
    old_dir, old_knowledge = quiz_session.QUIZZES_DIR, quiz_session.KNOWLEDGE_DIR
    try:
        state = create_quiz_state(KB_ID, "user-1", concept_count=2)
        assert [concept.name for concept in state.concepts] == [
            "class and object",
            "constructor",
        ]
        engine = StubEngine()

        first = build_next_question(state, None, engine=engine)
        _assert_no_answer_key(first)
        assert first["angle"] == "definition"
        answer = submit_answer(state, first["question_id"], 0, True, "I know this")
        assert answer["correct"] is True
        assert answer["streak"] == 1
        assert state.concepts[0].status == "practicing"

        second = build_next_question(state, None, engine=engine)
        assert second["angle"] == "application"
        answer = submit_answer(state, second["question_id"], 0, True, "Sure")
        assert answer["streak"] == 2
        assert answer["concept_status"] == "practicing"

        third = build_next_question(state, None, engine=engine)
        assert third["angle"] == "code_trace"
        answer = submit_answer(state, third["question_id"], 0, True, "Confident")
        assert answer["streak"] == 3
        assert answer["concept_status"] == "mastered"
        assert answer["finished"] is False
        assert state.concepts[0].status == "mastered"
        assert state.current_concept == "constructor"
        assert state.history[-1]["question"]["correct_index"] == 0

        save_quiz(state)
        loaded = load_quiz(state.quiz_id)
        assert loaded.concepts[0].status == "mastered"
        assert loaded.current_concept == "constructor"
        print("  OK streak/mastery: 3 angles, application included, next concept.")
    finally:
        quiz_session.QUIZZES_DIR, quiz_session.KNOWLEDGE_DIR = old_dir, old_knowledge
        shutil.rmtree(root, ignore_errors=True)


def test_correct_but_uncertain_does_not_increase_streak():
    root, knowledge = _setup_temp_kb()
    old_dir, old_knowledge = quiz_session.QUIZZES_DIR, quiz_session.KNOWLEDGE_DIR
    try:
        state = create_quiz_state(KB_ID, "user-2", concept_count=1)
        engine = StubEngine()
        question = build_next_question(state, None, engine=engine)
        answer = submit_answer(state, question["question_id"], 0, False, "Not sure")
        assert answer["correct"] is True
        assert answer["uncertain"] is True
        assert answer["streak"] == 0
        assert answer["concept_status"] == "practicing"
        assert state.history[-1]["uncertain"] is True
        print("  OK correct+not confident keeps streak and flags uncertain.")
    finally:
        quiz_session.QUIZZES_DIR, quiz_session.KNOWLEDGE_DIR = old_dir, old_knowledge
        shutil.rmtree(root, ignore_errors=True)


def test_wrong_answer_retests_with_new_angle_and_target():
    root, knowledge = _setup_temp_kb()
    old_dir, old_knowledge = quiz_session.QUIZZES_DIR, quiz_session.KNOWLEDGE_DIR
    try:
        state = create_quiz_state(KB_ID, "user-3", concept_count=1)
        engine = StubEngine()
        first = build_next_question(state, None, engine=engine)
        assert engine.calls[0]["angle"] == "definition"
        answer = submit_answer(state, first["question_id"], 1, False, "I guessed")
        assert answer["correct"] is False
        assert answer["chosen_misconception"] == "Misconception from option A1"
        assert state.concepts[0].streak == 0
        assert state.concepts[0].wrong_count == 1
        assert state.concepts[0].misconceptions_hit == ["Misconception from option A1"]

        second = build_next_question(state, None, engine=engine)
        assert second["angle"] != first["angle"]
        assert engine.calls[1]["angle"] == "application"
        assert engine.calls[1]["target"] == "Misconception from option A1"
        print("  OK wrong answer picks a different angle and targets the misconception.")
    finally:
        quiz_session.QUIZZES_DIR, quiz_session.KNOWLEDGE_DIR = old_dir, old_knowledge
        shutil.rmtree(root, ignore_errors=True)


def test_three_wrong_answers_need_review_and_finish():
    root, knowledge = _setup_temp_kb()
    old_dir, old_knowledge = quiz_session.QUIZZES_DIR, quiz_session.KNOWLEDGE_DIR
    try:
        state = create_quiz_state(KB_ID, "user-4", concept_count=1)
        engine = StubEngine()
        for index in range(3):
            question = build_next_question(state, None, engine=engine)
            answer = submit_answer(
                state,
                question["question_id"],
                1,
                False,
                f"wrong {index + 1}",
            )
            assert answer["correct"] is False
            assert answer["streak"] == 0
        assert answer["concept_status"] == "needs_review"
        assert state.concepts[0].wrong_count == 3
        assert state.current_concept is None
        assert answer["finished"] is True
        public = public_quiz(state)
        assert public["finished"] is True
        assert public["progress"]["completed"] == 1
        print("  OK three wrong answers -> needs_review and quiz finished.")
    finally:
        quiz_session.QUIZZES_DIR, quiz_session.KNOWLEDGE_DIR = old_dir, old_knowledge
        shutil.rmtree(root, ignore_errors=True)


def test_concept_count_is_capped():
    root, knowledge = _setup_temp_kb()
    old_dir, old_knowledge = quiz_session.QUIZZES_DIR, quiz_session.KNOWLEDGE_DIR
    try:
        state = create_quiz_state(KB_ID, "user-5", concept_count=4)
        assert len(state.concepts) == 3
        assert state.current_concept == "class and object"
        print("  OK concept_count is capped by the available concepts.")
    finally:
        quiz_session.QUIZZES_DIR, quiz_session.KNOWLEDGE_DIR = old_dir, old_knowledge
        shutil.rmtree(root, ignore_errors=True)


def run_test():
    print("=" * 62)
    print("TEST: adaptive quiz session")
    print("=" * 62)
    test_mastery_and_advance()
    test_correct_but_uncertain_does_not_increase_streak()
    test_wrong_answer_retests_with_new_angle_and_target()
    test_three_wrong_answers_need_review_and_finish()
    test_concept_count_is_capped()
    print()
    print("=" * 62)
    print("SUCCESS: adaptive quiz session verified working!")
    print("=" * 62)


if __name__ == "__main__":
    run_test()
