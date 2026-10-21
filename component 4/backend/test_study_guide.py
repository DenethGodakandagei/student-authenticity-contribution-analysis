"""
Tests for Study Guide and Progressive Hints:
- GET /sessions/{session_id}/study-guide:
    * 200 for session owner
    * 403 for non-owner
    * 404 for missing session or KB without chunks
    * Cached on second call (mocked LLM called only once)
    * Contains no "wrong_belief" or "correct_concept" text
    * Logs session event {type: "study_guide_viewed", timestamp}
- POST /sessions/{session_id}/hint:
    * Levels 1-3 work and return structured hint under 60 words
    * 4th hint for the same misconception returns 429
    * Answer/request from non-owner is rejected with 403
    * Session events {type: "hint_used", level, misconception_id, timestamp} logged
    * When no unresolved misconceptions remain, returns polite message
"""
import json
import os
import shutil
import sys
import tempfile

backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

from app.config import settings

# Temporary secret for auth
TEST_SECRET = "test-secret-" + "s" * 50
settings.JWT_SECRET = TEST_SECRET
settings.JWT_ALGORITHM = "HS256"

from app import auth
from app.llm import BaseLLMProvider
from app.nova_agent import MisconceptionState, NovaState, NovaStudentAgent
from fastapi.testclient import TestClient
from app.main import app

# Temporary users DB
_tmpdir = tempfile.mkdtemp(prefix="nova-study-guide-test-")
auth.DB_PATH = os.path.join(_tmpdir, "users.db")

client = TestClient(app)

OWNER_USER = {
    "name": "Guide Owner",
    "email": "owner@example.com",
    "password": "password123",
    "consent": True,
}

OTHER_USER = {
    "name": "Other Student",
    "email": "other@example.com",
    "password": "password123",
    "consent": True,
}


def _auth_token(user_data: dict) -> str:
    resp = client.post("/auth/register", json=user_data)
    if resp.status_code == 409:
        resp = client.post(
            "/auth/login",
            json={"email": user_data["email"], "password": user_data["password"]},
        )
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


def _headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


class MockStudyGuideAndHintProvider(BaseLLMProvider):
    """Deterministic mock provider for study guide and hint generation."""

    def __init__(self):
        self.guide_calls = 0
        self.hint_calls = 0

    def generate(self, prompt: str, json_mode: bool = False) -> str:
        if "overview" in prompt or "teaching_tips" in prompt:
            self.guide_calls += 1
            return json.dumps({
                "topic": "Object Oriented Programming",
                "overview": "Object oriented programming is a paradigm based on objects and classes. It helps organize software into modular, reusable components. Students will learn how data and behavior are bound together.",
                "sections": [
                    {
                        "concept": "class and object",
                        "explanation": "A class is a blueprint or template, while an object is a concrete instance created from that blueprint.",
                        "analogy": "Think of a class as a cookie cutter and objects as the delicious cookies cut out from it.",
                        "example": "class Dog:\n    def __init__(self, name):\n        self.name = name\nd = Dog('Rex')",
                        "key_points": [
                            "Classes define properties and methods",
                            "Objects hold concrete values"
                        ],
                        "source_pages": [7, 9, 10]
                    }
                ],
                "teaching_tips": [
                    "Use a simple everyday analogy first",
                    "Provide a short 3-line code example",
                    "Ask Nova to explain the difference in her own words"
                ]
            })

        if "Level" in prompt or "hint" in prompt.lower():
            self.hint_calls += 1
            if "Level 1" in prompt:
                hint_str = "Think about whether a class is the blueprint or the concrete instance."
            elif "Level 2" in prompt:
                hint_str = "If a class is like an architectural blueprint for a house, what is the actual house built from it?"
            else:
                hint_str = "Key facts from lecture: An object is a specific instance of a class, whereas the class defines the structure."
            return json.dumps({"hint": hint_str})

        return "{}"


def _create_test_session(owner_id: str, kb_id: str = "demo") -> str:
    """Creates a session file directly on disk with known state."""
    sessions_dir = os.path.join(backend_dir, "sessions")
    os.makedirs(sessions_dir, exist_ok=True)
    session_id = f"test_sg_{os.urandom(4).hex()}"

    m1 = MisconceptionState(
        id="m1",
        concept="class and object",
        wrong_concept="I think that a class is a specific instance of an object.",
        correct_concept="An Object is a specific instance of the data type (class).",
        reason="Students may confuse the concept of a class with an instance.",
        source_pages=[9],
        source_quote="An Object is a specific instance of the data type (class)",
        status="active",
        is_corrected=False,
    )

    state = NovaState(
        session_id=session_id,
        topic="Object Oriented Programming",
        kb_id=kb_id,
        owner_id=owner_id,
        misconceptions=[m1],
    )

    nova = NovaStudentAgent(state=state)
    path = os.path.join(sessions_dir, f"{session_id}.json")
    nova.save_state(path)
    return session_id


def test_study_guide_flow():
    owner_token = _auth_token(OWNER_USER)
    other_token = _auth_token(OTHER_USER)

    owner_me = client.get("/auth/me", headers=_headers(owner_token)).json()
    owner_id = str(owner_me["id"])

    # Ensure cached study_guide.json in demo is removed before test
    cache_path = os.path.join(backend_dir, "knowledge", "demo", "study_guide.json")
    if os.path.exists(cache_path):
        os.remove(cache_path)

    session_id = _create_test_session(owner_id, kb_id="demo")
    session_path = os.path.join(backend_dir, "sessions", f"{session_id}.json")

    mock_provider = MockStudyGuideAndHintProvider()

    # Inject mock provider when session is loaded
    orig_load_state = NovaStudentAgent.load_state

    def mock_load(filepath, provider=None):
        return orig_load_state(filepath, provider=mock_provider)

    NovaStudentAgent.load_state = mock_load

    try:
        # 1. Non-owner gets 403
        resp_403 = client.get(
            f"/sessions/{session_id}/study-guide",
            headers=_headers(other_token),
        )
        assert resp_403.status_code == 403, f"Expected 403, got {resp_403.status_code}"

        # 2. Owner gets 200 on first call (LLM generated)
        resp_owner = client.get(
            f"/sessions/{session_id}/study-guide",
            headers=_headers(owner_token),
        )
        assert resp_owner.status_code == 200, resp_owner.text
        guide = resp_owner.json()
        assert guide["topic"] == "Object Oriented Programming"
        assert len(guide["sections"]) > 0
        assert len(guide["teaching_tips"]) > 0
        assert mock_provider.guide_calls == 1

        # Check that response has NO wrong_belief or correct_concept field/text
        guide_raw_str = json.dumps(guide).lower()
        assert "wrong_concept" not in guide_raw_str
        assert "wrong_belief" not in guide_raw_str
        assert "correct_concept" not in guide_raw_str
        assert "misconceptions" not in guide_raw_str

        # 3. Check event logged
        with open(session_path, "r", encoding="utf-8") as f:
            saved_session = json.load(f)
        events = saved_session.get("events", [])
        assert any(e.get("type") == "study_guide_viewed" for e in events)

        # 4. Second call returns cached version (mock LLM NOT called again)
        resp_cached = client.get(
            f"/sessions/{session_id}/study-guide",
            headers=_headers(owner_token),
        )
        assert resp_cached.status_code == 200
        assert mock_provider.guide_calls == 1  # Still 1 call!

        # 5. Missing KB / no chunks returns 404
        no_kb_session = _create_test_session(owner_id, kb_id="non_existent_kb_xyz")
        resp_no_kb = client.get(
            f"/sessions/{no_kb_session}/study-guide",
            headers=_headers(owner_token),
        )
        assert resp_no_kb.status_code == 404
        assert "not found" in resp_no_kb.json()["detail"].lower()

        # 6. Session with empty kb_id returns 404
        empty_kb_session = _create_test_session(owner_id, kb_id="")
        resp_empty_kb = client.get(
            f"/sessions/{empty_kb_session}/study-guide",
            headers=_headers(owner_token),
        )
        assert resp_empty_kb.status_code == 404
        assert "no associated knowledge base" in resp_empty_kb.json()["detail"].lower()

        print("  OK study guide: 200 for owner, 403 for non-owner, cached on 2nd call, clean response, event logged, 404 for missing chunks.")

    finally:
        NovaStudentAgent.load_state = orig_load_state
        if os.path.exists(cache_path):
            os.remove(cache_path)


def test_hint_flow():
    owner_token = _auth_token(OWNER_USER)
    other_token = _auth_token(OTHER_USER)

    owner_me = client.get("/auth/me", headers=_headers(owner_token)).json()
    owner_id = str(owner_me["id"])

    session_id = _create_test_session(owner_id, kb_id="demo")
    session_path = os.path.join(backend_dir, "sessions", f"{session_id}.json")

    mock_provider = MockStudyGuideAndHintProvider()
    orig_load_state = NovaStudentAgent.load_state

    def mock_load(filepath, provider=None):
        return orig_load_state(filepath, provider=mock_provider)

    NovaStudentAgent.load_state = mock_load

    try:
        # 1. Non-owner rejected with 403
        resp_403 = client.post(
            f"/sessions/{session_id}/hint",
            headers=_headers(other_token),
            json={"level": 1},
        )
        assert resp_403.status_code == 403

        # 2. Level 1 hint
        resp1 = client.post(
            f"/sessions/{session_id}/hint",
            headers=_headers(owner_token),
            json={"level": 1},
        )
        assert resp1.status_code == 200, resp1.text
        data1 = resp1.json()
        assert data1["level"] == 1
        assert data1["concept"] == "class and object"
        assert len(data1["hint"].split()) <= 60
        assert data1["hints_left"] == 2

        # 3. Level 2 hint
        resp2 = client.post(
            f"/sessions/{session_id}/hint",
            headers=_headers(owner_token),
            json={"level": 2},
        )
        assert resp2.status_code == 200, resp2.text
        data2 = resp2.json()
        assert data2["level"] == 2
        assert data2["hints_left"] == 1

        # 4. Level 3 hint
        resp3 = client.post(
            f"/sessions/{session_id}/hint",
            headers=_headers(owner_token),
            json={"level": 3},
        )
        assert resp3.status_code == 200, resp3.text
        data3 = resp3.json()
        assert data3["level"] == 3
        assert data3["hints_left"] == 0

        # 5. 4th hint for same misconception returns 429
        resp4 = client.post(
            f"/sessions/{session_id}/hint",
            headers=_headers(owner_token),
            json={"level": 1},
        )
        assert resp4.status_code == 429, f"Expected 429, got {resp4.status_code}"
        assert "maximum of 3 hints" in resp4.json()["detail"]

        # 6. Verify logged events in session file
        with open(session_path, "r", encoding="utf-8") as f:
            saved_session = json.load(f)
        hint_events = [e for e in saved_session.get("events", []) if e.get("type") == "hint_used"]
        assert len(hint_events) == 3
        assert [e["level"] for e in hint_events] == [1, 2, 3]
        assert all(e["misconception_id"] == "m1" for e in hint_events)
        assert all("timestamp" in e for e in hint_events)

        # 7. When all misconceptions are resolved, returns polite message
        saved_session["misconceptions"][0]["is_corrected"] = True
        saved_session["misconceptions"][0]["status"] = "learned"
        with open(session_path, "w", encoding="utf-8") as f:
            json.dump(saved_session, f)

        resp_all_done = client.post(
            f"/sessions/{session_id}/hint",
            headers=_headers(owner_token),
            json={"level": 1},
        )
        assert resp_all_done.status_code == 200
        assert "no open confusions" in resp_all_done.json()["hint"]
        assert resp_all_done.json()["concept"] is None
        assert resp_all_done.json()["hints_left"] == 0

        print("  OK hints: levels 1-3 work, 429 on 4th call, non-owner 403, events logged, no confusions message.")

    finally:
        NovaStudentAgent.load_state = orig_load_state


def run_all_tests():
    print("==========================================================")
    print("TEST: Study Guide & Progressive Hints (test_study_guide.py)")
    print("==========================================================")
    print(f"  (temporary users DB: {auth.DB_PATH})")

    try:
        test_study_guide_flow()
        test_hint_flow()
        print("\n==========================================================")
        print("SUCCESS: Study guide and progressive hints tests passed!")
        print("==========================================================")
    finally:
        shutil.rmtree(_tmpdir, ignore_errors=True)


if __name__ == "__main__":
    run_all_tests()
