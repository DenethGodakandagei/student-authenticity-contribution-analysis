"""Route-level check for GET /quizzes/{id}/summary.

Verifies per-concept mastery feedback, distinct misconception pages, difflib
matching against the misconception repository, ownership, and summary logging.

Run: python test_quiz_summary.py
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

KB_ID = "summarykb"


def _setup() -> tuple[str, str, str]:
    root = tempfile.mkdtemp(prefix="nova-summary-test-")
    knowledge = os.path.join(root, "knowledge")
    quizzes = os.path.join(root, "quizzes")
    kb_dir = os.path.join(knowledge, KB_ID)
    os.makedirs(kb_dir)
    os.makedirs(quizzes)
    with open(os.path.join(kb_dir, "concepts.json"), "w", encoding="utf-8") as handle:
        json.dump(["constructor", "polymorphism"], handle)
    with open(os.path.join(kb_dir, "meta.json"), "w", encoding="utf-8") as handle:
        json.dump({"name": "Summary Test KB"}, handle)
    with open(
        os.path.join(kb_dir, "misconceptions.json"), "w", encoding="utf-8"
    ) as handle:
        json.dump(
            [
                {"id": "m-constructor", "concept": "constructors and objects"},
                {"id": "m-overloading", "concept": "method overloading"},
            ],
            handle,
        )
    return root, knowledge, quizzes


def _history(
    concept: str,
    page: int,
    correct: bool,
    uncertain: bool = False,
    misconception: str = "",
) -> Dict[str, Any]:
    return {
        "correct": correct,
        "uncertain": uncertain,
        "chosen_misconception": misconception,
        "question": {
            "concept": concept,
            "source": {"page": page, "line_start": 1, "line_end": 2, "quote": "q"},
        },
    }


def run_test():
    print("=" * 62)
    print("TEST: quiz summary and weak misconception matching")
    print("=" * 62)

    root, knowledge, quizzes = _setup()
    old_dirs = (quiz_session.KNOWLEDGE_DIR, quiz_session.QUIZZES_DIR)
    old_step = quiz_session.step
    logs: List[tuple[str, Dict[str, Any]]] = []

    current_user = {"id": "summary-user", "name": "Summary User"}

    def fake_user():
        return current_user

    def capture_step(stage: str, message: str, **fields: Any):
        logs.append((message, fields))

    quiz_session.KNOWLEDGE_DIR = knowledge
    quiz_session.QUIZZES_DIR = quizzes
    quiz_session.step = capture_step
    app.dependency_overrides[get_current_user] = fake_user

    try:
        state = quiz_session.create_quiz_state(KB_ID, "summary-user", concept_count=2)
        state.concepts[0] = quiz_session.ConceptState(
            name="constructor", status="practicing"
        )
        state.concepts[1] = quiz_session.ConceptState(
            name="polymorphism", status="mastered"
        )
        state.current_concept = None
        state.history = [
            _history(
                "constructor",
                4,
                correct=False,
                misconception="Objects are constructors",
            ),
            _history(
                "constructor",
                5,
                correct=False,
                misconception="Objects are constructors",
            ),
            _history("constructor", 4, correct=True, uncertain=True),
            _history("polymorphism", 8, correct=True),
        ]
        quiz_session.save_quiz(state)

        client = TestClient(app)
        response = client.get(f"/quizzes/{state.quiz_id}/summary")
        assert response.status_code == 200, response.text
        body = response.json()

        assert body["quiz_id"] == state.quiz_id
        assert body["kb_id"] == KB_ID
        assert body["kb_name"] == "Summary Test KB"
        assert body["mastery_percent"] == 50
        assert body["weak_misconception_ids"] == ["m-constructor"]

        concepts = {item["name"]: item for item in body["concepts"]}
        constructor = concepts["constructor"]
        assert constructor["status"] == "practicing"
        assert constructor["attempts"] == 3
        assert constructor["correct_count"] == 1
        assert constructor["uncertain_count"] == 1
        assert constructor["misconceptions_hit"] == [
            {"misconception": "Objects are constructors", "source_page": 4}
        ]
        assert constructor["pages_to_revisit"] == [4, 5]

        polymorphism = concepts["polymorphism"]
        assert polymorphism["status"] == "mastered"
        assert polymorphism["attempts"] == 1
        assert polymorphism["correct_count"] == 1
        assert polymorphism["uncertain_count"] == 0
        assert polymorphism["misconceptions_hit"] == []
        assert polymorphism["pages_to_revisit"] == []
        print("  OK per-concept status, attempts, misconceptions, and pages are correct.")

        concept_logs = [fields for message, fields in logs if message == "summary concept"]
        candidate_logs = [
            fields
            for message, fields in logs
            if message == "weak misconception candidate"
        ]
        selected_logs = [
            fields
            for message, fields in logs
            if message == "weak misconceptions selected"
        ]
        assert len(concept_logs) == 2
        assert len(candidate_logs) == 2
        assert selected_logs == [
            {"quiz_id": state.quiz_id, "count": 1, "ids": "m-constructor"}
        ]
        exact = next(
            item for item in candidate_logs if item["misconception_id"] == "m-constructor"
        )
        skipped = next(
            item for item in candidate_logs if item["misconception_id"] == "m-overloading"
        )
        assert exact["decision"] == "matched"
        assert 0.6 <= exact["ratio"] < 1.0
        assert skipped["decision"] == "skipped" and skipped["ratio"] < 0.6
        print("  OK summary logs every candidate ratio and the final weak ids.")

        app.dependency_overrides[get_current_user] = lambda: {
            "id": "other-user",
            "name": "Other",
        }
        forbidden = client.get(f"/quizzes/{state.quiz_id}/summary")
        assert forbidden.status_code == 403, forbidden.text
        print("  OK another user cannot read the quiz summary.")
    finally:
        app.dependency_overrides.clear()
        quiz_session.step = old_step
        quiz_session.KNOWLEDGE_DIR, quiz_session.QUIZZES_DIR = old_dirs
        shutil.rmtree(root, ignore_errors=True)

    print()
    print("=" * 62)
    print("SUCCESS: quiz summary contract verified!")
    print("=" * 62)


if __name__ == "__main__":
    run_test()
