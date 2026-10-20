"""Tests for Stage 9 pre/post tests and learning-gain scoring.

The LLM is stubbed: `generate_json` is replaced with a deterministic fake, so
no Ollama or network call is made. Route tests use FastAPI's dependency override
for authentication, so MongoDB is not needed.

Run: python test_learning_eval.py
"""
import os
import sys
import tempfile

backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

from app.config import settings

settings.JWT_SECRET = "test-secret-" + "x" * 50
settings.JWT_ALGORITHM = "HS256"

from app import learning_eval as learning_eval_module
from app.auth import get_current_user
from app.learning_eval import (
    GeneratedTestOutput,
    GeneratedTestQuestion,
    compute_evaluation,
    generate_test,
    score_test,
)
from app.nova_agent import MisconceptionState, NovaState, NovaStudentAgent


MISCONCEPTIONS = [
    MisconceptionState(
        id="m1",
        concept="constructor",
        wrong_concept="A constructor destroys the object.",
        correct_concept="The constructor initializes the object when it is declared.",
        reason="Confuses construction with destruction.",
        source_pages=[34],
        source_quote="The constructor is used to initialize the object when it is declared.",
    ),
    MisconceptionState(
        id="m2",
        concept="class and object",
        wrong_concept="A class is a specific instance of an object.",
        correct_concept="An object is a specific instance of the class.",
        reason="Swaps class and object.",
        source_pages=[9],
        source_quote="An Object is a specific instance of the data type (class).",
    ),
]


def _fake_output(prompt: str) -> GeneratedTestOutput:
    """Deterministic fake LLM output, keyed by pre/post prompt text."""
    form = "post" if "POST-TEST" in prompt else "pre"
    return GeneratedTestOutput(questions=[
        GeneratedTestQuestion(
            id="m1",
            concept="constructor",
            question=f"{form}: what does a constructor do?",
            options=["it initializes the object", "it destroys the object", "it returns a value", "it hides fields"],
            correct_index=0,
            explanation="The lecture says a constructor initializes the object.",
        ),
        GeneratedTestQuestion(
            id="m2",
            concept="class and object",
            question=f"{form}: which statement is true?",
            options=["a class is an instance of an object", "the object is an instance of a class", "a class cannot be instantiated", "objects are blueprints"],
            correct_index=1,
            explanation="The lecture says an object is a specific instance of a class.",
        ),
    ])


class _FakeJSON:
    """Replacement for generate_json that records prompts and returns fake output."""

    def __init__(self):
        self.prompts = []

    def __call__(self, prompt, schema, provider=None, retries=1):
        self.prompts.append(prompt)
        return _fake_output(prompt)


def _with_fake_json(callable_):
    """Runs callable_ while generate_json is stubbed; restores it afterwards."""
    original = learning_eval_module.generate_json
    fake = _FakeJSON()
    learning_eval_module.generate_json = fake
    try:
        return callable_(fake)
    finally:
        learning_eval_module.generate_json = original


def test_generate_pre_and_wrong_belief_distractor():
    state = NovaState(topic="OOP", misconceptions=MISCONCEPTIONS)

    def run(fake):
        questions = generate_test(state, "pre")
        assert len(fake.prompts) == 1, "pre-test must use exactly one LLM call"
        prompt = fake.prompts[0]
        assert "PRE-TEST" in prompt
        for misconception in MISCONCEPTIONS:
            assert misconception.correct_concept in prompt
            assert misconception.source_quote in prompt
            assert misconception.wrong_concept in prompt
        return questions

    questions = _with_fake_json(run)
    assert len(questions) == 2
    for question in questions:
        assert len(question["options"]) == 4
        assert 0 <= question["correct_index"] <= 3
        assert question["explanation"]

    # The fake output did not include Nova's exact wrong belief, so the helper
    # must replace one distractor with it.
    m1 = next(q for q in questions if q["id"] == "m1")
    wrong = MISCONCEPTIONS[0].wrong_concept
    assert wrong in m1["options"]
    assert m1["options"][m1["correct_index"]] != wrong
    print("  OK generate_test('pre'): one call, one MCQ per misconception, wrong belief included.")


def test_post_uses_pre_questions_as_avoid():
    state = NovaState(topic="OOP", misconceptions=MISCONCEPTIONS)
    state.tests["pre"] = {
        "questions": [
            {"id": "m1", "concept": "constructor", "question": "PRE UNIQUE WORDING ONE",
             "options": ["a", "b", "c", "d"], "correct_index": 0, "explanation": "e"},
        ],
        "answers": [],
        "score": None,
        "submitted_at": None,
    }

    def run(fake):
        questions = generate_test(state, "post")
        assert len(fake.prompts) == 1, "post-test must use exactly one LLM call"
        prompt = fake.prompts[0]
        assert "POST-TEST" in prompt
        assert "PRE UNIQUE WORDING ONE" in prompt, "pre questions must be passed as avoid"
        assert "different wording" in prompt and "different examples" in prompt
        return questions

    questions = _with_fake_json(run)
    assert questions[0]["question"].startswith("post:")
    print("  OK generate_test('post'): pre-test questions passed as avoid, new wording used.")


def test_score_per_question_per_concept_and_overall():
    questions = [
        {"id": "q1", "concept": "constructor", "question": "Q1",
         "options": ["a", "b", "c", "d"], "correct_index": 0, "explanation": "E1"},
        {"id": "q2", "concept": "constructor", "question": "Q2",
         "options": ["a", "b", "c", "d"], "correct_index": 2, "explanation": "E2"},
        {"id": "q3", "concept": "inheritance", "question": "Q3",
         "options": ["a", "b", "c", "d"], "correct_index": 1, "explanation": "E3"},
    ]
    answers = [
        {"question_id": "q1", "choice": 0},
        {"question_id": "q2", "choice": 1},
    ]

    score = score_test(questions, answers)
    assert score["total_questions"] == 3
    assert score["correct_count"] == 1
    assert score["overall_percentage"] == 33.33
    assert [row["correct"] for row in score["per_question"]] == [True, False, False]
    assert score["per_question"][0]["explanation"] == "E1"
    by_concept = {row["concept"]: row for row in score["per_concept"]}
    assert by_concept["constructor"]["correct"] == 1
    assert by_concept["constructor"]["total"] == 2
    assert by_concept["constructor"]["percentage"] == 50.0
    assert by_concept["inheritance"]["percentage"] == 0.0
    print("  OK score_test: per-question, per-concept and overall percentages in plain Python.")


def test_public_dict_hides_unsubmitted_answer_keys():
    state = NovaState(topic="OOP", misconceptions=MISCONCEPTIONS)
    state.tests["pre"] = {
        "questions": [{"id": "m1", "concept": "constructor", "question": "pre?",
                       "options": ["a", "b", "c", "d"], "correct_index": 2,
                       "explanation": "secret"}],
        "answers": [], "score": None, "submitted_at": None,
    }
    state.tests["post"] = {
        "questions": [{"id": "m1", "concept": "constructor", "question": "post?",
                       "options": ["a", "b", "c", "d"], "correct_index": 3,
                       "explanation": "shown after submit"}],
        "answers": [], "score": {"overall_percentage": 100.0}, "submitted_at": "2026-01-01",
    }
    nova = NovaStudentAgent(state)

    public = nova.to_public_dict()
    pre_question = public["tests"]["pre"]["questions"][0]
    assert "correct_index" not in pre_question and "explanation" not in pre_question
    post_question = public["tests"]["post"]["questions"][0]
    assert post_question["correct_index"] == 3
    assert post_question["explanation"] == "shown after submit"

    # Persistence keeps the real answer key.
    assert nova.to_dict()["tests"]["pre"]["questions"][0]["correct_index"] == 2
    print("  OK to_public_dict: hides unsubmitted keys, keeps submitted keys and saved state.")


def test_legacy_state_gets_empty_tests():
    legacy = {
        "session_id": "legacy-eval",
        "topic": "OOP",
        "misconceptions": [
            {"id": "m1", "wrong_concept": "w", "correct_concept": "c", "reason": "r"}
        ],
        "conversation_history": [],
    }
    nova = NovaStudentAgent.from_dict(legacy)
    assert nova.state.tests == {}
    print("  OK legacy session JSON loads without a tests field.")


def _test_record(overall: float, rows: list) -> dict:
    """Hand-built stored test record with a score object."""
    return {
        "questions": [],
        "answers": [],
        "score": {
            "total_questions": len(rows),
            "correct_count": sum(1 for row in rows if row["correct"]),
            "overall_percentage": overall,
            "per_question": rows,
            "per_concept": [],
        },
        "submitted_at": "2026-01-01T12:00:00",
    }


def test_compute_evaluation_hand_built_state():
    m1 = MisconceptionState(
        id="m1", concept="constructor", wrong_concept="w1", correct_concept="c1",
        reason="r1", status="learned", is_corrected=True,
        attempts=[{"question": "q", "answer": "a", "passed": True, "feedback": "ok"}],
    )
    m2 = MisconceptionState(
        id="m2", concept="class and object", wrong_concept="w2", correct_concept="c2",
        reason="r2", status="testing",
    )
    m3 = MisconceptionState(
        id="m3", concept="inheritance", wrong_concept="w3", correct_concept="c3",
        reason="r3", status="active",
    )
    state = NovaState(topic="OOP", misconceptions=[m1, m2, m3])

    pre_rows = [
        {"question_id": "m1", "concept": "constructor", "question": "pre1",
         "choice": 1, "correct_index": 0, "correct": False, "explanation": ""},
        {"question_id": "m2", "concept": "class and object", "question": "pre2",
         "choice": 1, "correct_index": 0, "correct": False, "explanation": ""},
        {"question_id": "m3", "concept": "inheritance", "question": "pre3",
         "choice": 0, "correct_index": 0, "correct": True, "explanation": ""},
    ]
    post_rows = [
        {"question_id": "m1", "concept": "constructor", "question": "post1",
         "choice": 0, "correct_index": 0, "correct": True, "explanation": ""},
        {"question_id": "m2", "concept": "class and object", "question": "post2",
         "choice": 0, "correct_index": 0, "correct": True, "explanation": ""},
        {"question_id": "m3", "concept": "inheritance", "question": "post3",
         "choice": 1, "correct_index": 0, "correct": False, "explanation": ""},
    ]
    state.tests = {
        "pre": _test_record(40.0, pre_rows),
        "post": _test_record(90.0, post_rows),
    }
    state.events = [
        {"type": "teacher_message", "time": "2026-01-01T10:00:00"},
        {"type": "check_result", "time": "2026-01-01T10:00:01"},
        {"type": "nova_reply", "time": "2026-01-01T10:00:02"},
        {"type": "teacher_message", "time": "2026-01-01T10:01:00"},
        {"type": "nova_reply", "time": "2026-01-01T10:01:10"},
    ]

    evaluation = compute_evaluation(state)
    assert evaluation["pre_score"] == 40.0
    assert evaluation["post_score"] == 90.0
    assert evaluation["absolute_gain"] == 50.0
    assert evaluation["normalized_gain"] == 0.833
    assert evaluation["gain_label"] == "high"
    assert evaluation["misconceptions_corrected"] == 1
    assert evaluation["misconceptions_total"] == 3
    assert evaluation["concepts_explained"] == 2

    rows = {row["concept"]: row for row in evaluation["per_concept"]}
    assert rows["constructor"] == {
        "concept": "constructor",
        "pre_correct": False,
        "post_correct": True,
        "status": "learned",
        "tries": 1,
    }
    assert rows["class and object"]["status"] == "testing"
    assert rows["class and object"]["pre_correct"] is False
    assert rows["class and object"]["post_correct"] is True
    assert rows["inheritance"]["status"] == "active"

    stats = evaluation["teaching_stats"]
    assert stats["teacher_turns"] == 2
    assert stats["avg_response_seconds"] == 6.0
    assert stats["max_response_seconds"] == 10.0
    print("  OK compute_evaluation: gains, per-concept rows, corrected/explained, teaching stats.")


def test_compute_evaluation_unfinished_and_pre_100():
    state = NovaState(topic="OOP", misconceptions=MISCONCEPTIONS)

    evaluation = compute_evaluation(state)
    assert evaluation["pre_score"] is None
    assert evaluation["post_score"] is None
    assert evaluation["absolute_gain"] is None
    assert evaluation["normalized_gain"] is None
    assert evaluation["gain_label"] is None
    assert evaluation["misconceptions_corrected"] == 0
    assert evaluation["misconceptions_total"] == 2
    assert evaluation["concepts_explained"] == 0
    for row in evaluation["per_concept"]:
        assert row["pre_correct"] is None and row["post_correct"] is None
    assert evaluation["teaching_stats"] == {
        "teacher_turns": 0,
        "avg_response_seconds": None,
        "max_response_seconds": None,
    }

    state.tests = {
        "pre": _test_record(100.0, []),
        "post": _test_record(100.0, []),
    }
    evaluation = compute_evaluation(state)
    assert evaluation["absolute_gain"] == 0.0
    assert evaluation["normalized_gain"] is None
    assert evaluation["gain_label"] is None
    print("  OK compute_evaluation: unfinished tests and pre-score 100 return nulls cleanly.")


def test_test_routes():
    from fastapi.testclient import TestClient
    from app.main import app
    from app import main as main_module

    tmpdir = tempfile.mkdtemp(prefix="nova-eval-test-")
    old_main_sessions = main_module.SESSIONS_DIR
    old_eval_sessions = learning_eval_module.SESSIONS_DIR
    main_module.SESSIONS_DIR = tmpdir
    learning_eval_module.SESSIONS_DIR = tmpdir
    app.dependency_overrides[get_current_user] = lambda: {"id": "u1", "role": "student"}
    client = TestClient(app)

    try:
        state = NovaState(
            session_id="eval-route",
            topic="OOP",
            owner_id="u1",
            misconceptions=MISCONCEPTIONS,
        )
        NovaStudentAgent(state).save_state(os.path.join(tmpdir, "eval-route.json"))

        def pre_flow(fake):
            # Generate the pre-test: no answer keys in the response.
            resp = client.post("/sessions/eval-route/tests/pre")
            assert resp.status_code == 200, resp.text
            body = resp.json()
            assert body["form"] == "pre" and body["submitted"] is False
            assert len(body["questions"]) == 2
            for question in body["questions"]:
                assert set(question) == {"id", "concept", "question", "options"}
            assert "correct_index" not in resp.text and "explanation" not in resp.text

            # GET /sessions/{id} must not leak either.
            get_resp = client.get("/sessions/eval-route")
            assert get_resp.status_code == 200, get_resp.text
            stored = get_resp.json()["tests"]["pre"]["questions"][0]
            assert "correct_index" not in stored and "explanation" not in stored

            # Post-test cannot be submitted before the pre-test.
            assert client.post(
                "/sessions/eval-route/tests/post/submit",
                json={"answers": []},
            ).status_code == 400

            # Submit the pre-test.
            answers = [
                {"question_id": "m1", "choice": 0},
                {"question_id": "m2", "choice": 0},
            ]
            submit = client.post(
                "/sessions/eval-route/tests/pre/submit", json={"answers": answers}
            )
            assert submit.status_code == 200, submit.text
            result = submit.json()
            assert result["score"]["overall_percentage"] == 50.0
            assert len(result["results"]) == 2
            assert result["results"][0]["explanation"]

            # Resubmitting the pre-test is a conflict.
            again = client.post(
                "/sessions/eval-route/tests/pre/submit", json={"answers": answers}
            )
            assert again.status_code == 409, again.text

            # Generate and submit the post-test.
            post = client.post("/sessions/eval-route/tests/post")
            assert post.status_code == 200, post.text
            assert "correct_index" not in post.text and "explanation" not in post.text
            post_submit = client.post(
                "/sessions/eval-route/tests/post/submit",
                json={"answers": [
                    {"question_id": "m1", "choice": 0},
                    {"question_id": "m2", "choice": 1},
                ]},
            )
            assert post_submit.status_code == 200, post_submit.text
            assert post_submit.json()["score"]["overall_percentage"] == 100.0

            # Required event names were logged.
            get_resp = client.get("/sessions/eval-route")
            event_types = [event["type"] for event in get_resp.json()["events"]]
            assert "pretest_submitted" in event_types
            assert "posttest_submitted" in event_types

            # Stage 9 evaluation route.
            eval_resp = client.get("/sessions/eval-route/evaluation")
            assert eval_resp.status_code == 200, eval_resp.text
            evaluation = eval_resp.json()
            assert evaluation["pre_score"] == 50.0
            assert evaluation["post_score"] == 100.0
            assert evaluation["absolute_gain"] == 50.0
            assert evaluation["normalized_gain"] == 1.0
            assert evaluation["gain_label"] == "high"
            assert evaluation["misconceptions_corrected"] == 0
            assert evaluation["misconceptions_total"] == 2
            assert len(evaluation["per_concept"]) == 2
            assert evaluation["per_concept"][0]["pre_correct"] is True
            assert evaluation["per_concept"][0]["post_correct"] is True

            # Bad form -> 400.
            assert client.post("/sessions/eval-route/tests/midterm").status_code == 400

        _with_fake_json(pre_flow)
        print("  OK routes: generate, no pre-submit leaks, 400/409 rules, events logged.")
    finally:
        app.dependency_overrides.clear()
        main_module.SESSIONS_DIR = old_main_sessions
        learning_eval_module.SESSIONS_DIR = old_eval_sessions
        import shutil
        shutil.rmtree(tmpdir, ignore_errors=True)


def run_test():
    print("==========================================================")
    print("TEST: Stage 9 pre/post tests and learning evaluation")
    print("==========================================================")
    test_generate_pre_and_wrong_belief_distractor()
    test_post_uses_pre_questions_as_avoid()
    test_score_per_question_per_concept_and_overall()
    test_public_dict_hides_unsubmitted_answer_keys()
    test_legacy_state_gets_empty_tests()
    test_compute_evaluation_hand_built_state()
    test_compute_evaluation_unfinished_and_pre_100()
    test_test_routes()
    print("\n==========================================================")
    print("SUCCESS: pre/post tests and scoring verified working!")
    print("==========================================================")


if __name__ == "__main__":
    run_test()
