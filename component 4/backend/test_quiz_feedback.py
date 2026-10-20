"""Route-level check for the quiz answer feedback contract.

Verifies POST /quizzes/{id}/answer returns every field the feedback panel needs,
covers wrong, correct-sure, correct-unsure, needs_review, and mastered cases,
and checks the feedback-section logging payload.

Run: python test_quiz_feedback.py
"""
import json
import os
import shutil
import sys
import tempfile
from typing import Any, Dict, List

backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

from fastapi.testclient import TestClient

from app import quiz_session
from app.auth import get_current_user
from app.main import app
import app.quiz_routes as routes

KB_ID = "feedbackkb"
REQUIRED_FIELDS = {
    "correct",
    "correct_index",
    "chosen_option",
    "correct_option",
    "chosen_misconception",
    "why_wrong",
    "explanation",
    "example",
    "source",
    "concept_status",
    "streak",
    "finished",
    "uncertain",
    "next_concept",
}


class StubEngine:
    def __init__(self):
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
        number = self.counter
        return {
            "angle": angle,
            "question": f"Stub question {number} for {concept} ({angle})",
            "options": [
                "Right answer",
                f"Wrong answer A{number}",
                f"Wrong answer B{number}",
                f"Wrong answer C{number}",
            ],
            "correct_index": 0,
            "option_notes": [
                {"misconception": "", "why_wrong": ""},
                {
                    "misconception": f"Misconception A{number}",
                    "why_wrong": "That option confuses two ideas.",
                },
                {
                    "misconception": f"Misconception B{number}",
                    "why_wrong": "That option skips the constructor.",
                },
                {
                    "misconception": f"Misconception C{number}",
                    "why_wrong": "That option reverses the order.",
                },
            ],
            "explanation": "The right answer follows the rule.",
            "example": "example = Demo()",
            "source_chunk_id": "p1_c0",
            "source_quote": "A verbatim line from the PDF.",
            "source": {
                "page": 3,
                "line_start": 10 + number,
                "line_end": 11 + number,
                "quote": "A verbatim line from the PDF.",
            },
        }


def _setup() -> tuple[str, str, str]:
    root = tempfile.mkdtemp(prefix="nova-feedback-test-")
    knowledge = os.path.join(root, "knowledge")
    quizzes = os.path.join(root, "quizzes")
    kb_dir = os.path.join(knowledge, KB_ID)
    os.makedirs(kb_dir)
    os.makedirs(quizzes)
    with open(os.path.join(kb_dir, "concepts.json"), "w", encoding="utf-8") as handle:
        json.dump(["class and object", "constructor"], handle)
    return root, knowledge, quizzes


def _assert_contract(answer: Dict[str, Any]) -> None:
    missing = REQUIRED_FIELDS - set(answer)
    assert not missing, f"response missing fields: {sorted(missing)}"
    assert isinstance(answer["source"], dict)
    for key in ("page", "line_start", "line_end", "quote"):
        assert key in answer["source"], f"source missing {key}"
    assert isinstance(answer["chosen_option"], str)
    assert isinstance(answer["correct_option"], str)
    assert isinstance(answer["next_concept"], (str, type(None)))


def run_test():
    print("=" * 62)
    print("TEST: quiz answer feedback contract")
    print("=" * 62)

    root, knowledge, quizzes = _setup()
    old_dirs = (quiz_session.KNOWLEDGE_DIR, quiz_session.QUIZZES_DIR)
    old_access = routes.check_kb_access
    old_load = routes.KnowledgeBase.load
    old_next = routes.build_next_question
    old_step = routes.step

    current_user = {"id": "feedback-user", "name": "Feedback User"}
    engine = StubEngine()
    feedback_logs: List[Dict[str, Any]] = []

    def fake_user():
        return current_user

    def fake_access(kb_id: str, user: Dict[str, Any]):
        return {"state": "ready"}

    def fake_next(state, kb):
        return old_next(state, kb, engine=engine)

    def capture_step(stage: str, message: str, **fields: Any):
        if message == "answer feedback returned":
            feedback_logs.append(fields)

    quiz_session.KNOWLEDGE_DIR = knowledge
    quiz_session.QUIZZES_DIR = quizzes
    routes.check_kb_access = fake_access
    routes.KnowledgeBase.load = classmethod(lambda cls, kb_id: object())
    routes.build_next_question = fake_next
    routes.step = capture_step
    app.dependency_overrides[get_current_user] = fake_user

    try:
        client = TestClient(app)
        created = client.post(
            "/quizzes", json={"kb_id": KB_ID, "concept_count": 2}
        )
        assert created.status_code == 200, created.text
        quiz_id = created.json()["quiz_id"]

        def next_and_answer(choice: int, confident: bool) -> Dict[str, Any]:
            question = client.post(f"/quizzes/{quiz_id}/next")
            assert question.status_code == 200, question.text
            payload = question.json()
            assert "correct_index" not in payload
            answer = client.post(
                f"/quizzes/{quiz_id}/answer",
                json={
                    "question_id": payload["question_id"],
                    "choice": choice,
                    "confident": confident,
                    "reasoning": "test reasoning",
                },
            )
            assert answer.status_code == 200, answer.text
            body = answer.json()
            _assert_contract(body)
            return body

        wrong = next_and_answer(1, False)
        assert wrong["correct"] is False
        assert wrong["chosen_option"] == "Wrong answer A1"
        assert wrong["chosen_misconception"] == "Misconception A1"
        assert wrong["why_wrong"]
        assert wrong["concept_status"] == "practicing"
        assert wrong["next_concept"] is None
        print("  OK wrong answer returns misconception, why_wrong, and source.")

        sure = next_and_answer(0, True)
        assert sure["correct"] is True and sure["uncertain"] is False
        assert sure["concept_status"] == "practicing"
        next_and_answer(0, True)

        mastered = next_and_answer(0, True)
        assert mastered["concept_status"] == "mastered"
        assert mastered["next_concept"] == "constructor"
        print("  OK mastered answer exposes the next concept.")

        unsure = next_and_answer(0, False)
        assert unsure["correct"] is True and unsure["uncertain"] is True
        assert unsure["concept_status"] == "practicing"
        print("  OK correct-but-unsure answer keeps the full explanation fields.")

        for _ in range(3):
            review = next_and_answer(1, False)
        assert review["concept_status"] == "needs_review"
        assert review["finished"] is True
        print("  OK needs_review answer returns source page and lines.")

        cases = {entry["case"] for entry in feedback_logs}
        assert cases == {
            "wrong",
            "correct-sure",
            "correct-unsure",
            "needs_review",
            "mastered",
        }, cases
        wrong_log = next(
            entry for entry in feedback_logs if entry["case"] == "wrong"
        )
        assert wrong_log["sections"] == (
            "misconception, why_wrong, explanation, example, source"
        )
        assert wrong_log["source_page"] == 3
        assert "-" in wrong_log["source_lines"]
        print("  OK answer route logs feedback sections and the rendered case.")
    finally:
        app.dependency_overrides.clear()
        routes.check_kb_access = old_access
        routes.KnowledgeBase.load = old_load
        routes.build_next_question = old_next
        routes.step = old_step
        quiz_session.KNOWLEDGE_DIR, quiz_session.QUIZZES_DIR = old_dirs
        shutil.rmtree(root, ignore_errors=True)

    print()
    print("=" * 62)
    print("SUCCESS: quiz answer feedback contract verified!")
    print("=" * 62)


if __name__ == "__main__":
    run_test()
