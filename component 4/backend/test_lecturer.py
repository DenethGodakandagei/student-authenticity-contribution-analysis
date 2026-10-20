"""
Tests for the /lecturer/* routes and the login role-check.

Uses the same temporary-database / temporary-JWT-secret pattern as test_auth.py.

Run: python test_lecturer.py
"""
import os
import sys

backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

from app.config import settings

# Apply test overrides BEFORE importing app modules (they use a module-level
# startup guard that reads JWT_SECRET).
TEST_SECRET = "test-lecturer-secret-" + "x" * 50
settings.JWT_SECRET = TEST_SECRET
settings.JWT_ALGORITHM = "HS256"
settings.LECTURER_CODE = "test-lec-code-9999"

import secrets
from fastapi.testclient import TestClient

from app import auth
from app.main import app

# Use an isolated DB so these tests never pollute production data.
TEST_DB_NAME = f"nova_lecturer_test_{secrets.token_hex(6)}"
settings.MONGO_DB_NAME = TEST_DB_NAME

client = TestClient(app)

# ---------------------------------------------------------------------------
# Fixtures – one student, one lecturer
# ---------------------------------------------------------------------------
STUDENT = {
    "name": "Student Sam",
    "email": "student-sam@example.com",
    "password": "password123",
    "consent": True,
}
LECTURER = {
    "name": "Lecturer Lee",
    "email": "lecturer-lee@example.com",
    "password": "password456",
    "consent": True,
    "role": "lecturer",
    "lecturer_code": settings.LECTURER_CODE,
}


def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _register(user: dict) -> str:
    """Register a user and return their access token."""
    resp = client.post("/auth/register", json=user)
    assert resp.status_code == 200, f"Register failed: {resp.text}"
    return resp.json()["access_token"]


def _login(email: str, password: str, role: str = "student") -> str:
    """Log in and return the access token."""
    resp = client.post(
        "/auth/login",
        json={"email": email, "password": password, "role": role},
    )
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    return resp.json()["access_token"]


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

def test_login_wrong_role_gives_403():
    """A student account cannot sign in with role='lecturer' -> 403."""
    _register(STUDENT)  # idempotent if already exists
    resp = client.post(
        "/auth/login",
        json={"email": STUDENT["email"], "password": STUDENT["password"], "role": "lecturer"},
    )
    assert resp.status_code == 403, resp.text
    detail = resp.json().get("detail", "")
    # The message must name the actual role so the user knows what to pick.
    assert "student" in detail.lower(), f"Expected role hint in: {detail}"
    print("  OK student signing in as 'lecturer' -> 403 with role hint.")


def test_login_correct_role_gives_200():
    """Student signs in with role='student' -> 200; lecturer with 'lecturer' -> 200."""
    student_token = _login(STUDENT["email"], STUDENT["password"], role="student")
    assert student_token
    print("  OK student with correct role='student' -> 200.")

    _register(LECTURER)  # idempotent
    lecturer_token = _login(LECTURER["email"], LECTURER["password"], role="lecturer")
    assert lecturer_token
    print("  OK lecturer with correct role='lecturer' -> 200.")


def test_student_token_on_lecturer_routes_gives_403():
    """A student's JWT must be rejected (403) on all /lecturer/* routes."""
    student_token = _login(STUDENT["email"], STUDENT["password"], role="student")
    hdrs = _auth_headers(student_token)

    resp = client.get("/lecturer/overview", headers=hdrs)
    assert resp.status_code == 403, f"/lecturer/overview: {resp.text}"
    print("  OK student token on /lecturer/overview -> 403.")

    resp = client.get("/lecturer/students", headers=hdrs)
    assert resp.status_code == 403, f"/lecturer/students: {resp.text}"
    print("  OK student token on /lecturer/students -> 403.")


def test_lecturer_token_on_overview_gives_200():
    """A lecturer's JWT must be accepted on /lecturer/overview -> 200."""
    _register(LECTURER)
    lecturer_token = _login(LECTURER["email"], LECTURER["password"], role="lecturer")
    hdrs = _auth_headers(lecturer_token)

    resp = client.get("/lecturer/overview", headers=hdrs)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    # All expected keys must be present.
    for key in (
        "total_students",
        "total_sessions",
        "total_misconceptions",
        "total_corrected",
        "correction_rate",
        "active_last_7_days",
    ):
        assert key in body, f"Missing key '{key}' in overview response: {body}"
    print(f"  OK lecturer token on /lecturer/overview -> 200 ({body}).")


def test_lecturer_students_list():
    """/lecturer/students returns a list; each entry has the expected keys."""
    _register(LECTURER)
    lecturer_token = _login(LECTURER["email"], LECTURER["password"], role="lecturer")
    hdrs = _auth_headers(lecturer_token)

    resp = client.get("/lecturer/students", headers=hdrs)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert isinstance(body, list)
    if body:
        for key in (
            "id", "name", "session_count",
            "misconceptions_total", "misconceptions_corrected",
            "correction_rate", "last_active",
        ):
            assert key in body[0], f"Missing key '{key}' in student entry: {body[0]}"
    print(f"  OK /lecturer/students -> 200, {len(body)} student(s) returned.")


def test_lecturer_registration_without_code_gives_403():
    """Registering as lecturer without the correct code -> 403."""
    bad = dict(
        STUDENT,
        name="Bad Lecturer",
        email="bad-lec@example.com",
        role="lecturer",
        lecturer_code="wrong-code",
    )
    resp = client.post("/auth/register", json=bad)
    assert resp.status_code == 403, resp.text
    print("  OK lecturer registration with wrong code -> 403.")


def test_lecturer_registration_without_code_field_gives_403():
    """Registering as lecturer with no lecturer_code at all -> 403."""
    no_code = {
        "name": "No Code Lec",
        "email": "nocode-lec@example.com",
        "password": "password123",
        "consent": True,
        "role": "lecturer",
    }
    resp = client.post("/auth/register", json=no_code)
    assert resp.status_code == 403, resp.text
    print("  OK lecturer registration with no code field -> 403.")


def test_student_session_not_in_lecturer_students_sessions():
    """A student's session data is accessible through the lecturer API
    without exposing conversation_history."""
    student_token = _login(STUDENT["email"], STUDENT["password"], role="student")
    _register(LECTURER)
    lecturer_token = _login(LECTURER["email"], LECTURER["password"], role="lecturer")

    # Student creates a session.
    atlas_output = {
        "topic": "Python basics",
        "learning_objectives": ["Understand variables"],
        "misconceptions": [
            {
                "wrong_concept": "Variables are fixed.",
                "correct_concept": "Variables can change.",
                "reason": "test",
            }
        ],
    }
    create_resp = client.post(
        "/sessions/create-nova",
        json={"atlas_output": atlas_output},
        headers=_auth_headers(student_token),
    )
    assert create_resp.status_code == 200, create_resp.text
    session_id = create_resp.json()["session_id"]

    # Lecturer retrieves the overview and students list.
    overview = client.get("/lecturer/overview", headers=_auth_headers(lecturer_token)).json()
    assert overview["total_sessions"] >= 1

    students = client.get("/lecturer/students", headers=_auth_headers(lecturer_token)).json()
    student_entry = next(
        (s for s in students if s["name"] == STUDENT["name"]), None
    )
    assert student_entry is not None, f"Student not found in list: {students}"
    student_id = student_entry["id"]

    # Lecturer retrieves that student's sessions.
    sessions_resp = client.get(
        f"/lecturer/students/{student_id}/sessions",
        headers=_auth_headers(lecturer_token),
    )
    assert sessions_resp.status_code == 200, sessions_resp.text
    session_list = sessions_resp.json()
    our_session = next(
        (s for s in session_list if s["session_id"] == session_id), None
    )
    assert our_session is not None, f"Created session not found: {session_list}"
    # conversation_history must never be present.
    assert "conversation_history" not in our_session, "conversation_history leaked!"
    print(f"  OK lecturer can see student session {session_id} without conversation_history.")

    # Clean up the session file.
    from app.main import SESSIONS_DIR
    session_file = os.path.join(SESSIONS_DIR, f"{session_id}.json")
    if os.path.exists(session_file):
        os.remove(session_file)


# ---------------------------------------------------------------------------
# Runner
# ---------------------------------------------------------------------------

def run_test():
    print("==========================================================" )
    print("TEST: Lecturer routes + login role-check")
    print("==========================================================")
    print(f"  (temporary MongoDB database: {TEST_DB_NAME})")

    test_login_wrong_role_gives_403()
    test_login_correct_role_gives_200()
    test_student_token_on_lecturer_routes_gives_403()
    test_lecturer_token_on_overview_gives_200()
    test_lecturer_students_list()
    test_lecturer_registration_without_code_gives_403()
    test_lecturer_registration_without_code_field_gives_403()
    test_student_session_not_in_lecturer_students_sessions()

    # Clean up test database collections.
    try:
        db = auth._get_client()[TEST_DB_NAME]
        db["users"].drop()
        db["counters"].drop()
    except Exception as exc:
        print(f"  (warning: could not drop test collections: {exc})")

    print("\n==========================================================")
    print("SUCCESS: Lecturer routes verified working!")
    print("==========================================================")


if __name__ == "__main__":
    run_test()
