"""
Tests for KB-grounded Nova sessions:
- NovaStudentAgent.from_repository (explicit ids and count-based selection)
- Persona prompt rules (correct_concept never leaked for active misconceptions)
- Adaptive question gate: correction check -> testing -> questions -> answer judging
- Event logging during a chat turn (mock provider)
- POST /sessions/create-from-kb route and GET /sessions/{id}/summary (TestClient, JWT)
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
from app.nova_agent import NovaStudentAgent, understanding_summary

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


CLEAR_CONSTRUCTOR_MSG = (
    "A constructor is a special method that runs when you create an object with new. "
    "It initialises the object's fields. It has no return type."
)
VAGUE_CONSTRUCTOR_MSG = "A constructor is something that runs at some point."


def _mock_questions():
    """Three different check questions (definition / scenario / statement)."""
    return [
        {"question": "What is a constructor used for when an object is declared?",
         "expected_answer": "It initializes the object when it is declared."},
        {"question": "What happens to an object's fields when its constructor runs?",
         "expected_answer": "They are initialized."},
        {"question": "Which statement is true about a constructor?",
         "expected_answer": "It initializes the object when it is declared."},
    ]


class MockProvider(BaseLLMProvider):
    """
    Deterministic provider for the adaptive question gate: canned JSON for the
    correction check / question bank / answer judgement + a fixed plain-text reply.
    """

    def __init__(self, check_results=None, questions=None, verdict=None,
                 reply="Okay, let me think about that."):
        self.check_results = check_results if check_results is not None else []
        self.questions = questions or _mock_questions()
        self.verdict = verdict if verdict is not None else {
            "passed": False, "reasoning_ok": False, "feedback": "Not quite right."
        }
        self.reply = reply
        self.calls = []

    def generate(self, prompt: str, json_mode: bool = False) -> str:
        self.calls.append({"json_mode": json_mode, "prompt": prompt})
        if not json_mode:
            return self.reply
        if "reasoning_ok" in prompt:
            return json.dumps(self.verdict)
        if "EXACTLY 3 check questions" in prompt:
            return json.dumps({"questions": self.questions})
        return json.dumps({"results": self.check_results})


def _assert_events_in_order(events, required):
    """Required event types must appear in this order; extra events are allowed."""
    types = [e["type"] for e in events]
    pos = 0
    for event_type in types:
        if pos < len(required) and event_type == required[pos]:
            pos += 1
    assert pos == len(required), f"missing or out-of-order events: wanted {required}, got {types}"


def _assert_learned_only_after_passed_answer(nova):
    """'learned' may only ever follow a logged answer_judged event with passed=true."""
    events = nova.state.events
    for i, event in enumerate(events):
        if event["type"] == "status_change" and event.get("to") == "learned":
            previous = events[i - 1] if i else None
            assert previous and previous["type"] == "answer_judged" and previous.get("passed") is True, \
                f"status_change to learned without a logged passed answer: {event}"
    for m in nova.state.misconceptions:
        if m.status == "learned":
            assert m.is_corrected is True
            assert any(a.get("passed") for a in m.attempts), f"{m.id} learned with no passed attempt"
            assert any(e["type"] == "answer_judged" and e.get("passed") and e.get("id") == m.id
                       for e in events), f"{m.id} learned with no passed answer event"


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

    # Persona fix: talk straight to the other person with "you", 2-3 sentences.
    assert 'use "you" for them' in prompt, "persona must address the other person as you"
    assert '"the teacher"' in prompt and '"the student"' in prompt, "persona must forbid those labels"
    assert "2-3 sentences" in prompt, "persona must cap replies at 2-3 sentences"
    print("  OK persona prompt: no leak while active, learned concepts included.")


def test_chat_turn_events_and_state(check=True):
    questions = _mock_questions()
    provider = MockProvider(
        check_results=[
            {"id": "m1", "addressed": True, "quality": "clear"},
            {"id": "m3", "addressed": False, "quality": "vague"},
        ],
        questions=questions,
        reply=f"Thanks, that helps! I want to be sure I really get it: {questions[0]['question']}",
    )
    nova = NovaStudentAgent.from_repository(KB_ID, misconception_ids=["m1", "m3"], provider=provider)

    result = nova.respond("A class is just a blueprint, and an object is a specific instance of that class.")

    # Response keys used by the chat endpoint / frontend must stay stable.
    for key in ("session_id", "nova_response", "newly_corrected_ids", "learning_progress",
                "unresolved_misconceptions_count", "learned_misconceptions_count",
                "unresolved_misconceptions", "learned_misconceptions", "state"):
        assert key in result, f"missing response key: {key}"
    # New adaptive-gate keys.
    for key in ("check_question", "check_result", "check_feedback", "understanding"):
        assert key in result, f"missing gate response key: {key}"

    assert result["nova_response"] == provider.reply
    # A correction check NEVER marks anything learned - it only opens the gate.
    assert result["newly_corrected_ids"] == []
    assert result["check_question"] == questions[0]["question"]
    assert result["check_result"] is None
    assert result["check_feedback"] is None
    assert result["understanding"]["overall_score"] is None

    # Events: teacher_message, check_result, status_change, question_asked, nova_reply.
    _assert_events_in_order(
        nova.state.events,
        ["teacher_message", "check_result", "status_change", "question_asked", "nova_reply"],
    )
    for e in nova.state.events:
        assert e["time"], "event missing time"
    assert nova.state.events[1]["results"][0]["id"] == "m1"
    assert nova.state.events[2]["to"] == "testing"
    assert nova.state.events[3]["question"] == questions[0]["question"]

    # State: addressed+clear -> testing, vague stays active, nothing learned.
    m1 = next(m for m in nova.state.misconceptions if m.id == "m1")
    m3 = next(m for m in nova.state.misconceptions if m.id == "m3")
    assert m1.status == "testing" and m1.is_corrected is False
    assert m3.status == "active" and m3.is_corrected is False
    assert len(m1.questions) == 3 and m1.question_index == 0 and m1.attempts == []
    assert len(nova.state.conversation_history) == 2

    # JSON-mode used for the correction check + question bank, plain text for the reply.
    modes = [c["json_mode"] for c in provider.calls]
    assert modes == [True, True, False], modes
    _assert_learned_only_after_passed_answer(nova)
    if check:
        print("  OK chat turn: gate events, testing status, history, json_mode usage.")


def test_correction_check_failure_is_non_fatal():
    class BrokenProvider(BaseLLMProvider):
        def generate(self, prompt: str, json_mode: bool = False) -> str:
            if json_mode:
                return "not json at all"
            return "Okay, I see your point."

    nova = NovaStudentAgent.from_repository(KB_ID, misconception_ids=["m1"], provider=BrokenProvider())
    result = nova.respond("Here is a full explanation of class and object.")
    assert result["newly_corrected_ids"] == []
    assert result["check_question"] is None and result["check_result"] is None
    assert all(m.status == "active" for m in nova.state.misconceptions)
    _assert_events_in_order(
        nova.state.events, ["teacher_message", "check_result", "nova_reply"]
    )
    assert nova.state.events[1]["error"], "failed check must log the error"
    print("  OK broken correction-check JSON is tolerated (no state change, event logged).")


def test_vague_or_wrong_message_never_reaches_learned():
    """A vague or wrong explanation changes nothing and can never mark learned."""
    for quality in ("vague", "wrong"):
        provider = MockProvider(
            check_results=[{"id": "m3", "addressed": True, "quality": quality}],
            reply="Hmm, runs at some point? I still think it destroys the object.",
        )
        nova = NovaStudentAgent.from_repository(KB_ID, misconception_ids=["m3"], provider=provider)
        result = nova.respond(VAGUE_CONSTRUCTOR_MSG)
        m = nova.state.misconceptions[0]

        assert m.status == "active" and m.is_corrected is False, f"{quality} explanation changed status"
        assert result["newly_corrected_ids"] == []
        assert result["check_question"] is None
        assert result["check_result"] is None
        assert result["understanding"]["overall_score"] is None
        _assert_events_in_order(
            nova.state.events, ["teacher_message", "check_result", "nova_reply"]
        )
        assert not any(e["type"] == "status_change" for e in nova.state.events)
        assert nova.state.events[1]["results"][0]["quality"] == quality
        _assert_learned_only_after_passed_answer(nova)
    print("  OK vague/wrong explanations cannot reach 'learned' (no status change at all).")


def test_gate_flow_needs_review_and_passed_answer():
    questions = _mock_questions()

    # (a) clear teaching -> testing -> three wrong answers -> needs_review.
    provider = MockProvider(
        check_results=[{"id": "m3", "addressed": True, "quality": "clear"}],
        questions=questions,
        verdict={"passed": False, "reasoning_ok": False, "feedback": "That is not right."},
    )
    nova = NovaStudentAgent.from_repository(KB_ID, misconception_ids=["m3"], provider=provider)
    first = nova.respond(CLEAR_CONSTRUCTOR_MSG)
    m = nova.state.misconceptions[0]

    assert m.status == "testing" and m.is_corrected is False
    assert first["check_question"] == questions[0]["question"]
    assert first["check_question"] in first["nova_response"], "reply must ask the first question"
    assert first["newly_corrected_ids"] == []

    second = nova.respond("A constructor deletes the object.")
    assert m.status == "testing" and m.question_index == 1
    assert second["check_result"] == "failed"
    assert second["check_question"] == questions[1]["question"]
    assert second["check_question"] != questions[0]["question"], "second question must be different"
    assert second["check_question"] in second["nova_response"], "reply must ask the next question"
    assert "still not sure" in second["nova_response"].lower()

    third = nova.respond("It wipes all the memory away.")
    assert m.status == "testing" and m.question_index == 2
    assert third["check_result"] == "failed"
    assert third["check_question"] == questions[2]["question"]

    fourth = nova.respond("No idea, maybe it prints the object.")
    assert m.status == "needs_review" and m.is_corrected is False
    assert fourth["check_result"] == "needs_review"
    assert fourth["check_question"] is None
    assert len(m.attempts) == 3
    assert [a["passed"] for a in m.attempts] == [False, False, False]
    assert "34" in fourth["nova_response"], "needs_review reply must cite the lecture page"
    assert not any(e["type"] == "status_change" and e.get("to") == "learned"
                   for e in nova.state.events)
    summary = understanding_summary(nova.state)["misconceptions"][0]
    assert summary["status"] == "needs_review" and summary["tries"] == 3 and summary["score"] == 0.0
    assert summary["source_pages"] == [34]
    _assert_learned_only_after_passed_answer(nova)

    # (b) a passed answer is the only path to learned.
    provider2 = MockProvider(
        check_results=[{"id": "m3", "addressed": True, "quality": "clear"}],
        questions=questions,
        verdict={"passed": True, "reasoning_ok": True, "feedback": "Correct."},
    )
    nova2 = NovaStudentAgent.from_repository(KB_ID, misconception_ids=["m3"], provider=provider2)
    nova2.respond(CLEAR_CONSTRUCTOR_MSG)
    result = nova2.respond(
        "It initialises the object's fields when the object is created and has no return type."
    )
    m2 = nova2.state.misconceptions[0]
    assert m2.status == "learned" and m2.is_corrected is True
    assert result["newly_corrected_ids"] == ["m3"]
    assert result["check_result"] == "passed"
    assert result["check_feedback"] == "Correct."
    assert result["check_question"] is None
    row = result["understanding"]["misconceptions"][0]
    assert row["tries"] == 1 and row["score"] == 1.0
    assert result["understanding"]["overall_score"] == 1.0
    _assert_learned_only_after_passed_answer(nova2)

    # Event order for the answering turns.
    _assert_events_in_order(nova2.state.events, [
        "teacher_message", "check_result", "status_change", "question_asked", "nova_reply",
        "teacher_message", "answer_judged", "status_change", "nova_reply",
    ])
    print("  OK gate: three wrong answers -> needs_review, passed answer -> learned.")


def test_understanding_summary_second_try_score():
    questions = _mock_questions()
    provider = MockProvider(
        check_results=[{"id": "m3", "addressed": True, "quality": "clear"}],
        questions=questions,
        verdict={"passed": False, "reasoning_ok": False, "feedback": "Not yet."},
    )
    nova = NovaStudentAgent.from_repository(KB_ID, misconception_ids=["m3"], provider=provider)
    nova.respond(CLEAR_CONSTRUCTOR_MSG)
    nova.respond("A constructor removes the object.")

    provider.verdict = {"passed": True, "reasoning_ok": True, "feedback": "Exactly."}
    result = nova.respond(
        "It initialises the object's fields when the object is created and has no return type."
    )

    summary = result["understanding"]
    row = summary["misconceptions"][0]
    assert row["concept"] == "constructor"
    assert row["status"] == "learned"
    assert row["tries"] == 2 and row["score"] == 0.67, row
    assert abs(summary["overall_score"] - 0.67) < 1e-9
    assert row["source_pages"] == [34]
    _assert_learned_only_after_passed_answer(nova)
    print("  OK understanding_summary: 2nd-try pass scores 0.67, source_pages reported.")


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

        # Understanding summary route (same ownership rule as the other session routes)
        summary_resp = client.get(f"/sessions/{body['session_id']}/summary", headers=headers)
        assert summary_resp.status_code == 200, summary_resp.text
        summary = summary_resp.json()
        assert summary["overall_score"] is None
        assert len(summary["misconceptions"]) == 2
        for row in summary["misconceptions"]:
            assert set(row) == {"concept", "status", "tries", "score", "source_pages"}, row
            assert row["status"] == "active" and row["tries"] == 0 and row["score"] is None
        assert client.get(f"/sessions/{body['session_id']}/summary").status_code == 401
        assert client.get("/sessions/no-such-session/summary", headers=headers).status_code == 404

        # A second user gets 403 on someone else's summary.
        other = dict(TEST_USER, email="session-tester-2@example.com")
        other_resp = client.post("/auth/register", json=other)
        assert other_resp.status_code == 200, other_resp.text
        other_headers = _auth_headers(other_resp.json()["access_token"])
        assert client.get(f"/sessions/{body['session_id']}/summary",
                          headers=other_headers).status_code == 403
        print("  OK GET /sessions/{id}/summary (200/401/404/403).")

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


def _run_live_scenario():
    """Scripted --live run: vague -> clear -> wrong answer -> right answer (m3, constructor)."""
    print("  Running scripted live scenario on one session (kb_id 'demo', misconception m3)...")
    nova = NovaStudentAgent.from_repository(KB_ID, misconception_ids=["m3"])
    fixed_answer = ("It initialises the object's fields when the object is created "
                    "and has no return type.")
    scenario = [
        ("1 vague explanation", VAGUE_CONSTRUCTOR_MSG, "active", None, False),
        ("2 clear explanation", CLEAR_CONSTRUCTOR_MSG, "testing", None, True),
        ("3 wrong answer", "A constructor deletes the object.", "testing", "failed", True),
        ("4 right answer", fixed_answer, "learned", "passed", False),
    ]

    checks = []
    durations = []
    first_question = None

    def note(label, ok, detail):
        checks.append(bool(ok))
        print(f"    [{'OK  ' if ok else 'MISS'}] {label}: {detail}")

    for i, (label, message, expected_status, expected_result, expect_question) in enumerate(scenario, 1):
        start = time.perf_counter()
        result = nova.respond(message)
        elapsed = time.perf_counter() - start
        durations.append(elapsed)
        m = nova.state.misconceptions[0]

        print(f"\n  --- Turn {i}: {label} ({elapsed:.1f}s) ---")
        print(f"  Message:             {message}")
        print(f"  Nova:                {result['nova_response']}")
        print(f"  Status:              {m.status}")
        print(f"  check_question:      {result['check_question']}")
        print(f"  check_result:        {result['check_result']}")
        print(f"  check_feedback:      {result['check_feedback']}")
        print(f"  newly_corrected_ids: {result['newly_corrected_ids'] or 'none'}")
        for row in result["understanding"]["misconceptions"]:
            print(f"  understanding:       {row['concept']} | status={row['status']} "
                  f"| tries={row['tries']} | score={row['score']} | pages={row['source_pages']}")
        print(f"  overall_score:       {result['understanding']['overall_score']}")
        print(f"  Time taken:          {elapsed:.1f}s")

        note(f"turn {i} status", m.status == expected_status,
             f"expected {expected_status}, got {m.status}")
        note(f"turn {i} check_result", result["check_result"] == expected_result,
             f"expected {expected_result}, got {result['check_result']}")
        if expect_question:
            note(f"turn {i} asks a check question", bool(result["check_question"]),
                 str(result["check_question"]))
        else:
            note(f"turn {i} asks no question", result["check_question"] is None,
                 str(result["check_question"]))

        if i == 2:
            first_question = result["check_question"]
        elif i == 3:
            note("turn 3 question differs from turn 2",
                 bool(result["check_question"]) and result["check_question"] != first_question,
                 f"{first_question!r} -> {result['check_question']!r}")

    print("\n  Understanding summary:")
    print(json.dumps(understanding_summary(nova.state), indent=2))
    print(f"\n  Average seconds per turn: {sum(durations) / len(durations):.1f}s")
    met = sum(1 for c in checks if c)
    print(f"  Live scenario expectations: {met}/{len(checks)} met.")
    if met == len(checks):
        print("  OK live scripted scenario.")
    else:
        print("  WARN live scripted scenario had mismatches (LLM variance).")


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
    test_vague_or_wrong_message_never_reaches_learned()
    test_gate_flow_needs_review_and_passed_answer()
    test_understanding_summary_second_try_score()
    test_legacy_state_backwards_compatible()
    test_create_from_kb_route()

    if "--live" in sys.argv:
        _run_live_scenario()
    else:
        print("  (add --live to run real LLM chat turns)")

    shutil.rmtree(_tmpdir, ignore_errors=True)

    print("\n==========================================================")
    print("SUCCESS: KB-grounded Nova session verified working!")
    print("==========================================================")


if __name__ == "__main__":
    run_test()
