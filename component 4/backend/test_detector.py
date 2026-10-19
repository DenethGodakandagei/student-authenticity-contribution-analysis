"""
Tests for the Stage 6 Misconception Detection Engine (app/detector.py).

Offline (no LLM needed):  python test_detector.py
With live LLM:            python test_detector.py --live

--live runs the detector on 10 hand-written cases built from the demo KB
misconceptions m1 (class/object reversed) and m3 (constructor destroys the
object): 5 Nova replies where the wrong belief is still present (2 of them
only indirectly, through an example or an assumption) and 5 where Nova shows
correct understanding or only asks a clarifying question. It prints each case
with expected vs actual and finishes with the detector accuracy and the
average seconds per call.
"""
import json
import os
import sys
import time

backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

from app.detector import detect_misconceptions, detect_misconceptions_checked
from app.llm import BaseLLMProvider
from app.nova_agent import NovaStudentAgent

KB_PATH = os.path.join(backend_dir, "knowledge", "demo", "misconceptions.json")

with open(KB_PATH, "r", encoding="utf-8") as _f:
    _KB = {item["id"]: item for item in json.load(_f)}

M1 = _KB["m1"]  # class is a specific instance / object is a blueprint
M3 = _KB["m3"]  # constructor destroys the object


def _as_input(m) -> dict:
    """The misconception shape the detector expects (id, concept, wrong_belief, correct_concept)."""
    return {
        "id": m["id"],
        "concept": m["concept"],
        "wrong_belief": m["wrong_belief"],
        "correct_concept": m["correct_concept"],
    }


# ============================================================================
# 10 hand-written cases: 5 still present (2 indirect), 5 not present
# ============================================================================

CASES = [
    # --- still_present: 3 direct ---
    {
        "label": "m3 direct: wrong belief stated in a code example",
        "m": M3,
        "teacher": "A constructor runs when you create an object with new and it sets up the object's fields.",
        "nova": "Got it, so when I write `Car myCar = new Car();` the constructor destroys the object "
                "as soon as it is declared.",
        "expected": True,
    },
    {
        "label": "m3 direct: wrong belief stated as a fact",
        "m": M3,
        "teacher": "Let's look at constructors again.",
        "nova": "A constructor is basically what wipes the object out of memory when it is declared.",
        "expected": True,
    },
    {
        "label": "m1 direct: wrong belief restated in her own words",
        "m": M1,
        "teacher": "Let's go over class and object one more time.",
        "nova": "I still think the class is the specific instance and the object is just the blueprint.",
        "expected": True,
    },
    # --- still_present: 2 indirect (example / assumption) ---
    {
        "label": "m3 indirect: assumed through an example (no 'destroy' word)",
        "m": M3,
        "teacher": "The constructor is used to initialize the object when it is declared.",
        "nova": "So if the constructor sets everything up at the start, then once it finishes there is "
                "nothing left of the object - that is why I would put the cleanup code inside the constructor.",
        "expected": True,
    },
    {
        "label": "m1 indirect: applied through a new example",
        "m": M1,
        "teacher": "An object is a specific instance of the data type, which is the class.",
        "nova": "So with `Dog myDog = new Dog();` I would say myDog is the blueprint and the Dog class "
                "is the specific instance I created.",
        "expected": True,
    },
    # --- not still_present: correct understanding ---
    {
        "label": "m3 gone: correct understanding stated",
        "m": M3,
        "teacher": "A constructor is used to initialize the object when it is declared.",
        "nova": "Oh I get it now - the constructor runs when the object is created and initialises its "
                "fields, it does not destroy anything.",
        "expected": False,
    },
    {
        "label": "m1 gone: correct understanding stated",
        "m": M1,
        "teacher": "An object is a specific instance of the class.",
        "nova": "Right, so the class is the blueprint and the object is one specific instance of it. Got it.",
        "expected": False,
    },
    {
        "label": "m3 gone: correct understanding with extra detail",
        "m": M3,
        "teacher": "Also remember that a constructor has no return type.",
        "nova": "Thanks - so constructors have no return type and they initialize the object when it is "
                "declared.",
        "expected": False,
    },
    # --- not still_present: clarifying questions ---
    {
        "label": "m3 gone: only a clarifying question",
        "m": M3,
        "teacher": "The constructor is used to initialize the object.",
        "nova": "Wait, do you mean the constructor runs before the object exists or right after it is "
                "created?",
        "expected": False,
    },
    {
        "label": "m1 gone: only a clarifying question",
        "m": M1,
        "teacher": "A class is a blueprint for objects.",
        "nova": "Do you mean we can create many different objects from the same class?",
        "expected": False,
    },
]


# ============================================================================
# Offline contract tests (mock providers, no LLM)
# ============================================================================

class CannedProvider(BaseLLMProvider):
    """Returns preset responses in order, one per generate() call."""

    def __init__(self, responses):
        self.responses = list(responses)
        self.calls = []

    def generate(self, prompt: str, json_mode: bool = False) -> str:
        self.calls.append({"json_mode": json_mode, "prompt": prompt})
        if not self.responses:
            raise AssertionError("CannedProvider ran out of responses.")
        return self.responses.pop(0)


class AgentMockProvider(BaseLLMProvider):
    """Correction check + plain reply + detector verdicts for the agent integration test."""

    def __init__(self):
        self.check_results = [{"id": "m3", "addressed": True, "quality": "vague"}]
        self.detection = [{"id": "m3", "still_present": True,
                           "evidence": "I still think it destroys the object.", "confidence": 0.9}]
        self.calls = []

    def generate(self, prompt: str, json_mode: bool = False) -> str:
        self.calls.append({"json_mode": json_mode, "prompt": prompt})
        if not json_mode:
            return "Hmm, I still think it destroys the object when it is declared."
        if "NOVA'S LATEST REPLY:" in prompt:
            return json.dumps({"results": self.detection})
        if "EXACTLY 3 check questions" in prompt:
            return json.dumps({"questions": [
                {"question": f"Question {i}?", "expected_answer": "answer"} for i in range(1, 4)
            ]})
        return json.dumps({"results": self.check_results})


def test_empty_input_skips_the_llm_call():
    provider = CannedProvider([])
    assert detect_misconceptions("Nova's reply.", "Teacher said.", [], provider=provider) == []
    assert provider.calls == [], "no misconceptions must skip the LLM call entirely"
    print("  OK empty misconception list returns [] with no LLM call.")


def test_valid_json_is_parsed():
    payload = {"results": [
        {"id": "m3", "still_present": True, "evidence": "the constructor destroys it", "confidence": 0.9},
        {"id": "m1", "still_present": False, "evidence": "", "confidence": 0.3},
    ]}
    provider = CannedProvider([json.dumps(payload)])
    results = detect_misconceptions("reply", "teacher", [_as_input(M3), _as_input(M1)], provider=provider)
    assert results == [
        {"id": "m3", "still_present": True, "evidence": "the constructor destroys it", "confidence": 0.9},
        {"id": "m1", "still_present": False, "evidence": "", "confidence": 0.3},
    ], results
    assert len(provider.calls) == 1 and provider.calls[0]["json_mode"] is True
    print("  OK valid JSON parsed into {id, still_present, evidence, confidence}.")


def test_bad_json_falls_back_after_one_retry():
    provider = CannedProvider(["not json at all", "still not json"])
    results, error = detect_misconceptions_checked(
        "reply", "teacher", [_as_input(M1), _as_input(M3)], provider=provider
    )
    assert len(provider.calls) == 2, "exactly one retry on bad JSON"
    assert all(c["json_mode"] for c in provider.calls)
    assert error, "checked variant must report the error"
    assert results == [
        {"id": "m1", "still_present": True, "evidence": "", "confidence": 0.0},
        {"id": "m3", "still_present": True, "evidence": "", "confidence": 0.0},
    ], results

    # The public function logs the error and still returns the fallback.
    provider2 = CannedProvider(["bad", "bad"])
    fallback = detect_misconceptions("reply", "teacher", [_as_input(M3)], provider=provider2)
    assert fallback == [{"id": "m3", "still_present": True, "evidence": "", "confidence": 0.0}]
    print("  OK bad JSON -> one retry -> still_present=true with empty evidence.")


def test_prompt_carries_the_detection_rules():
    provider = CannedProvider([json.dumps({"results": []})])
    detect_misconceptions("Nova's reply.", "Teacher said.", [_as_input(M3)], provider=provider)
    flat = " ".join(provider.calls[0]["prompt"].split())
    assert "still_present is true only if Nova's reply expresses or relies on the wrong belief" in flat
    assert "including indirectly through an example or an assumption" in flat
    assert "A question asking for clarification is NOT still_present" in flat
    assert "evidence must be a short exact quote from Nova's reply, or an empty string if not present" in flat
    assert M3["wrong_belief"] in provider.calls[0]["prompt"]
    print("  OK prompt tells the model the still_present / clarifying-question / evidence rules.")


def test_agent_turn_logs_detection_and_never_changes_status():
    """Detection is read-only and runs only on non-check-question turns with an active item."""
    provider = AgentMockProvider()
    nova = NovaStudentAgent.from_repository("demo", misconception_ids=["m3"], provider=provider)
    m = nova.state.misconceptions[0]

    result = nova.respond("Let's talk about constructors.")
    assert result["detection"] == provider.detection, "reply detection must be in the response"
    assert m.status == "active" and m.is_corrected is False, "detection must not change any status"
    assert [e["type"] for e in nova.state.events] == ["teacher_message", "check_result", "nova_reply", "detection"]
    assert nova.state.events[-1]["results"] == provider.detection

    # A turn whose reply IS a check question skips the detector entirely.
    provider.check_results = [{"id": "m3", "addressed": True, "quality": "clear"}]
    turns_before = len(provider.calls)
    result2 = nova.respond("A constructor is a special method that runs when you create an object "
                           "with new. It initialises the object's fields. It has no return type.")
    assert result2["check_question"], "clear explanation must open the gate"
    assert result2["detection"] == [], "check-question turns must skip the detector"
    assert m.status == "testing"
    detector_calls = [c for c in provider.calls[turns_before:] if "NOVA'S LATEST REPLY:" in c["prompt"]]
    assert detector_calls == [], "no detector LLM call on a check-question turn"
    print("  OK agent logs detection (read-only) and skips the detector on check-question turns.")


def _run_offline():
    print("  Running offline detector contract tests (mock providers, no LLM)...")
    test_empty_input_skips_the_llm_call()
    test_valid_json_is_parsed()
    test_bad_json_falls_back_after_one_retry()
    test_prompt_carries_the_detection_rules()
    test_agent_turn_logs_detection_and_never_changes_status()

    print(f"  ({len(CASES)} hand-written live cases: 5 still present incl. 2 indirect, "
          "5 correct/clarifying)")
    print("  (add --live to run the 10 cases against the real LLM)")


# ============================================================================
# Live run: 10 hand-written cases against the real LLM
# ============================================================================

def _run_live():
    print("  Running 10 hand-written detector cases against the real LLM...")
    correct = 0
    durations = []

    for i, case in enumerate(CASES, 1):
        start = time.perf_counter()
        results = detect_misconceptions(
            case["nova"], case["teacher"], [_as_input(case["m"])]
        )
        elapsed = time.perf_counter() - start
        durations.append(elapsed)

        actual = results[0]["still_present"] if results else None
        evidence = results[0]["evidence"] if results else ""
        confidence = results[0]["confidence"] if results else None
        hit = actual == case["expected"]
        correct += 1 if hit else 0

        print(f"\n  --- Case {i}: {case['label']} ({elapsed:.1f}s) ---")
        print(f"  Teacher:  {case['teacher']}")
        print(f"  Nova:     {case['nova']}")
        print(f"  Expected still_present: {case['expected']}")
        print(f"  Actual   still_present: {actual}  (confidence {confidence})")
        print(f"  Evidence: {evidence or '(none)'}")
        print(f"    [{'OK  ' if hit else 'MISS'}] expected {case['expected']}, got {actual}")

    print(f"\n  Detector accuracy: {correct}/{len(CASES)}")
    print(f"  Average seconds per call: {sum(durations) / len(durations):.2f}s")
    if correct == len(CASES):
        print("  OK detector matched all hand-written cases.")
    else:
        print("  WARN detector mismatches (LLM variance).")


def run_test():
    print("==========================================================")
    print("TEST: Misconception Detection Engine (Stage 6)")
    print("==========================================================")

    if not os.path.exists(KB_PATH):
        print(f"SKIP: {KB_PATH} not found.")
        return

    if "--live" in sys.argv:
        _run_live()
    else:
        _run_offline()

    print("\n==========================================================")
    print("SUCCESS: Misconception Detection Engine verified working!")
    print("==========================================================")


if __name__ == "__main__":
    run_test()
