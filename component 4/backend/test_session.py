"""
Tests for KB-grounded Nova sessions:
- NovaStudentAgent.from_repository (explicit ids and count-based selection)
- Persona prompt rules (correct_concept never leaked for active misconceptions)
- Event logging during a chat turn (mock provider)
- POST /sessions/create-from-kb route (TestClient, JWT protected)
- Legacy session state compatibility

Uses a temporary SQLite users database and a temporary JWT_SECRET, so the real
backend/data/users.db and the real .env secret are untouched.

Run:            python test_session.py
With live LLM:  python test_session.py --live
"""
import json
import os
import shutil
import sys
import tempfile
import time

backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

from app.config import settings

# Temporary secret (>= 32 chars) applied BEFORE the auth module is imported,
# so the startup guard in app/auth.py passes without touching the real .env.
TEST_SECRET = "test-secret-" + "y" * 50
settings.JWT_SECRET = TEST_SECRET
settings.JWT_ALGORITHM = "HS256"

from app import auth
from app.llm import BaseLLMProvider
from app.nova_agent import NovaStudentAgent

KB_ID = "demo"

# Temporary users database file for this test run only.
_tmpdir = tempfile.mkdtemp(prefix="nova-session-test-")
auth.DB_PATH = os.path.join(_tmpdir, "users.db")

TEST_USER = {
    "name": "Session Tester",
    "email": "session-tester@example.com",
    "password": "password123",
    "consent": True,
}


def _auth_headers(token: str) -> dict:
    """Bearer Authorization header for the JWT-protected routes."""
    return {"Authorization": f"Bearer {token}"}


def _register_test_user(client) -> str:
    """Registers the temporary test user and returns its access token."""
    resp = client.post("/auth/register", json=TEST_USER)
    if resp.status_code == 409:
        resp = client.post(
            "/auth/login",
            json={"email": TEST_USER["email"], "password": TEST_USER["password"]},
        )
    assert resp.status_code == 200, resp.text
    token = resp.json()["access_token"]
    assert token
    return token


class MockProvider(BaseLLMProvider):
    """Deterministic provider: JSON correction verdict + fixed plain-text reply."""

    def __init__(self, corrected_ids=None, reply="I still think a class is an instance of an object."):
        self.corrected_ids = corrected_ids or []
        self.reply = reply
        self.calls = []

    def generate(self, prompt: str, json_mode: bool = False) -> str:
        self.calls.append({"json_mode": json_mode, "prompt": prompt})
        if json_mode:
            return json.dumps({"corrected_ids": self.corrected_ids})
        return self.reply


def test_from_repository_explicit_ids():
    nova = NovaStudentAgent.from_repository(KB_ID, misconception_ids=["m1", "m3"])
    assert nova.state.kb_id == KB_ID
    assert nova.state.name == "Nova"
    assert nova.state.level == "beginner"
    assert nova.state.behaviour
    assert len(nova.state.misconceptions) == 2

    by_id = {m.id: m for m in nova.state.misconceptions}
    assert set(by_id) == {"m1", "m3"}
    for m in nova.state.misconceptions:
        assert m.status == "active"
        assert m.is_corrected is False
        assert m.concept
        assert m.source_pages, f"{m.id} missing source_pages"
        assert m.source_quote, f"{m.id} missing source_quote"
        assert 0.0 <= m.confidence <= 1.0
    assert by_id["m1"].concept == "class and object"
    assert by_id["m3"].concept == "constructor"
    print("  OK from_repository with explicit misconception ids.")


def test_from_repository_count_picks_distinct_concepts():
    nova = NovaStudentAgent.from_repository(KB_ID, count=3)
    concepts = [m.concept for m in nova.state.misconceptions]
    assert len(concepts) == 3
    assert len(set(concepts)) == 3, f"concepts not distinct: {concepts}"
    print("  OK count-based selection uses distinct concepts.")


def test_from_repository_errors():
    try:
        NovaStudentAgent.from_repository("no-such-kb")
        raise AssertionError("expected FileNotFoundError for unknown kb")
    except FileNotFoundError:
        pass
    try:
        NovaStudentAgent.from_repository(KB_ID, misconception_ids=["m1", "zzz"])
        raise AssertionError("expected ValueError for unknown misconception id")
    except ValueError:
        pass
    print("  OK unknown kb -> FileNotFoundError, unknown ids -> ValueError.")


def test_persona_prompt_never_leaks_active_correct_concept():
    nova = NovaStudentAgent.from_repository(KB_ID, misconception_ids=["m1", "m3"])
    prompt = nova._build_student_persona_prompt("What is a class?")
    for m in nova.state.misconceptions:
        assert m.correct_concept not in prompt, f"active correct_concept leaked for {m.id}"
        assert m.wrong_concept in prompt, f"wrong belief missing for {m.id}"
    assert nova.state.level in prompt
    assert nova.state.behaviour in prompt

    # After learning m1, its correct_concept may appear (learned section).
    m1 = nova.state.misconceptions[0]
    m1.mark_learned("An object is an instance of a class.")
    assert m1.status == "learned" and m1.is_corrected is True
    prompt_after = nova._build_student_persona_prompt("Any questions?")
    assert m1.correct_concept in prompt_after
    assert nova.state.misconceptions[1].correct_concept not in prompt_after
    print("  OK persona prompt: no leak while active, learned concepts included.")


def test_chat_turn_events_and_state(mock_corrected_ids=("m1",), check=True):
    provider = MockProvider(corrected_ids=list(mock_corrected_ids))
    nova = NovaStudentAgent.from_repository(KB_ID, misconception_ids=["m1", "m3"], provider=provider)

    result = nova.respond("A class is just a blueprint, and an object is a specific instance of that class.")

    # Response keys used by the chat endpoint / frontend must stay stable.
    for key in ("session_id", "nova_response", "newly_corrected_ids", "learning_progress",
                "unresolved_misconceptions_count", "learned_misconceptions_count",
                "unresolved_misconceptions", "learned_misconceptions", "state"):
        assert key in result, f"missing response key: {key}"
    assert result["nova_response"] == provider.reply
    assert set(result["newly_corrected_ids"]) == set(mock_corrected_ids)

    # Events: one teacher_message, one correction_check, one nova_reply, in order.
    types = [e["type"] for e in nova.state.events]
    assert types == ["teacher_message", "correction_check", "nova_reply"], types
    for e in nova.state.events:
        assert e["time"], "event missing time"
    assert nova.state.events[1]["corrected_ids"] == list(mock_corrected_ids)

    # State: learned misconceptions are synced, history has teacher + nova turns.
    m1 = next(m for m in nova.state.misconceptions if m.id == "m1")
    m3 = next(m for m in nova.state.misconceptions if m.id == "m3")
    assert m1.status == "learned" and m1.is_corrected is True
    assert m3.status == "active" and m3.is_corrected is False
    assert m1.user_explanation
    assert len(nova.state.conversation_history) == 2

    # JSON-mode used only for the correction check, plain text for the chat reply.
    modes = [c["json_mode"] for c in provider.calls]
    assert modes == [True, False], modes
    if check:
        print("  OK chat turn: events, state update, history, json_mode usage.")


def test_correction_check_failure_is_non_fatal():
    class BrokenProvider(BaseLLMProvider):
        def generate(self, prompt: str, json_mode: bool = False) -> str:
            if json_mode:
                return "not json at all"
            return "Okay, I see your point."

    nova = NovaStudentAgent.from_repository(KB_ID, misconception_ids=["m1"], provider=BrokenProvider())
    result = nova.respond("Here is a full explanation of class and object.")
    assert result["newly_corrected_ids"] == []
    assert all(m.status == "active" for m in nova.state.misconceptions)
    assert [e["type"] for e in nova.state.events] == ["teacher_message", "correction_check", "nova_reply"]
    print("  OK broken correction-check JSON is tolerated (no state change, event logged).")


def test_legacy_state_backwards_compatible():
    legacy = {
        "session_id": "legacy-1",
        "topic": "OOP",
        "misconceptions": [
            {"wrong_concept": "old wrong", "correct_concept": "old right", "reason": "r",
             "is_corrected": True},
            {"wrong_concept": "still wrong", "correct_concept": "not yet", "reason": "r",
             "is_corrected": False},
        ],
        "conversation_history": [],
        "created_at": "2026-01-01T00:00:00",
        "updated_at": "2026-01-01T00:00:00",
    }
    nova = NovaStudentAgent.from_dict(legacy, provider=MockProvider())
    learned, active = nova.state.misconceptions
    assert learned.status == "learned" and learned.is_corrected is True
    assert active.status == "active" and active.is_corrected is False
    assert nova.state.events == [] and nova.state.kb_id == ""
    print("  OK legacy session file loads with status/is_corrected kept in sync.")


def test_create_from_kb_route():
    from fastapi.testclient import TestClient
    from app.main import app, SESSIONS_DIR

    client = TestClient(app)
    created_files = []

    try:
        # Every route now needs a JWT: register a temporary test user first.
        token = _register_test_user(client)
        headers = _auth_headers(token)

        assert client.post("/sessions/create-from-kb",
                           json={"kb_id": KB_ID}).status_code == 401
        print("  OK protected route without a token gives 401.")

        # Happy path: explicit ids
        resp = client.post("/sessions/create-from-kb",
                           json={"kb_id": KB_ID, "misconception_ids": ["m1", "m3"]},
                           headers=headers)
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body["session_id"]
        state = body["state"]
        assert state["kb_id"] == KB_ID
        assert [m["id"] for m in state["misconceptions"]] == ["m1", "m3"]
        created_files.append(os.path.join(SESSIONS_DIR, f"{body['session_id']}.json"))
        assert os.path.exists(created_files[-1]), "session file not persisted"

        # GET roundtrip returns the same session
        get_resp = client.get(f"/sessions/{body['session_id']}", headers=headers)
        assert get_resp.status_code == 200, get_resp.text
        assert get_resp.json()["session_id"] == body["session_id"]

        # Count-based default (2 items, distinct concepts)
        resp2 = client.post("/sessions/create-from-kb", json={"kb_id": KB_ID},
                            headers=headers)
        assert resp2.status_code == 200, resp2.text
        concepts = [m["concept"] for m in resp2.json()["state"]["misconceptions"]]
        assert len(concepts) == 2 and len(set(concepts)) == 2
        created_files.append(os.path.join(SESSIONS_DIR, f"{resp2.json()['session_id']}.json"))

        # Error paths
        assert client.post("/sessions/create-from-kb", json={"kb_id": "nope"},
                           headers=headers).status_code == 404
        assert client.post("/sessions/create-from-kb",
                           json={"kb_id": KB_ID, "misconception_ids": ["zzz"]},
                           headers=headers).status_code == 400
        print("  OK POST /sessions/create-from-kb (200/404/400) and GET roundtrip.")
        print("  OK JWT Authorization header sent on every request.")
    finally:
        for path in created_files:
            if os.path.exists(path):
                os.remove(path)


def run_test():
    print("==========================================================")
    print("TEST: KB-grounded Nova session (from_repository + route)")
    print("==========================================================")
    print(f"  (temporary users DB: {auth.DB_PATH})")

    if not os.path.exists(os.path.join("knowledge", KB_ID, "misconceptions.json")):
        print(f"SKIP: knowledge/{KB_ID}/misconceptions.json not found.")
        shutil.rmtree(_tmpdir, ignore_errors=True)
        return

    test_from_repository_explicit_ids()
    test_from_repository_count_picks_distinct_concepts()
    test_from_repository_errors()
    test_persona_prompt_never_leaks_active_correct_concept()
    test_chat_turn_events_and_state()
    test_correction_check_failure_is_non_fatal()
    test_legacy_state_backwards_compatible()
    test_create_from_kb_route()

    if "--live" in sys.argv:
        print("  Running three live LLM turns on one session (Ollama)...")
        nova = NovaStudentAgent.from_repository(KB_ID, misconception_ids=["m1", "m3"])
        turns = [
            "A constructor is something that runs at some point.",
            "A constructor is a special method that runs when you create an object with new. "
            "It initialises the object's fields. It has no return type.",
            "A class is a blueprint, and an object is one instance made from that blueprint.",
        ]
        durations = []
        for i, teacher_msg in enumerate(turns, 1):
            start = time.perf_counter()
            result = nova.respond(teacher_msg)
            elapsed = time.perf_counter() - start
            durations.append(elapsed)
            print(f"\n  --- Turn {i} ({elapsed:.1f}s) ---")
            print(f"  Teacher: {teacher_msg}")
            print(f"  Nova:    {result['nova_response']}")
            print(f"  Corrected ids: {result['newly_corrected_ids'] or 'none'}")
            for m in nova.state.misconceptions:
                print(f"  [{m.id}] {m.concept}: {m.status}")
            print(f"  Time taken: {elapsed:.1f}s")
        print(f"\n  Average seconds per turn: {sum(durations) / len(durations):.1f}s")
        print("  OK live chat turns.")
    else:
        print("  (add --live to run real LLM chat turns)")

    shutil.rmtree(_tmpdir, ignore_errors=True)

    print("\n==========================================================")
    print("SUCCESS: KB-grounded Nova session verified working!")
    print("==========================================================")


if __name__ == "__main__":
    run_test()
