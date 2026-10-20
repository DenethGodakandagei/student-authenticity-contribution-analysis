"""
Tests for JWT auth: registration, login, protected routes, session ownership.

Uses a temporary MongoDB database and a temporary JWT_SECRET, so the real
Nova database and the real .env secret are untouched.

Requires MONGO_URI to point at a reachable MongoDB instance (it may be the same
cluster as production; a throwaway database name is used and dropped afterwards).

Run: python test_auth.py
"""
import os
import secrets
import sys
from datetime import datetime, timedelta, timezone

backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

# pyrefly: ignore [missing-import]
import jwt as pyjwt
from fastapi.testclient import TestClient

from app.config import settings

# Temporary secret (>= 32 chars) applied BEFORE the auth module is imported,
# so the startup guard in app/auth.py passes without touching the real .env.
TEST_SECRET = "test-secret-" + "x" * 50
settings.JWT_SECRET = TEST_SECRET
settings.JWT_ALGORITHM = "HS256"
settings.LECTURER_CODE = "test-lecturer-code"

from app import auth
from app.main import app

# Temporary MongoDB database for this test run only.
TEST_DB_NAME = f"nova_auth_test_{secrets.token_hex(6)}"
settings.MONGO_DB_NAME = TEST_DB_NAME

client = TestClient(app)

USER_A = {"name": "Alice", "email": "alice@example.com", "password": "password123", "consent": True}
USER_B = {"name": "Bob", "email": "bob@example.com", "password": "password456", "consent": True}


def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_register_and_duplicate_email():
    resp = client.post("/auth/register", json=USER_A)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]
    assert body["user"]["email"] == USER_A["email"]
    assert "password_hash" not in body["user"] and "salt" not in body["user"]
    assert body["user"]["role"] == "student", body["user"]
    assert body["user"]["anonymous_id"], body["user"]
    assert body["user"]["anonymous_id"].startswith("P-"), body["user"]
    assert body["user"]["cohort_id"] == "OOP-2026", body["user"]
    print("  OK register works and returns an access_token with role and anonymous_id.")

    second_user = dict(USER_A, name="Second", email="second@example.com")
    second_resp = client.post("/auth/register", json=second_user)
    assert second_resp.status_code == 200, second_resp.text
    assert second_resp.json()["user"]["anonymous_id"] != body["user"]["anonymous_id"]
    print("  OK two users get different anonymous_ids.")

    dup = client.post("/auth/register", json=USER_A)
    assert dup.status_code == 409, dup.text
    print("  OK duplicate email gives 409.")


def test_lecturer_registration():
    wrong = dict(
        USER_A,
        name="Lecturer Wrong",
        email="lecturer-wrong@example.com",
        role="lecturer",
        lecturer_code="wrong-code",
    )
    resp = client.post("/auth/register", json=wrong)
    assert resp.status_code == 403, resp.text
    print("  OK lecturer registration with a wrong code gives 403.")

    valid = dict(
        USER_A,
        name="Lecturer Valid",
        email="lecturer-valid@example.com",
        role="lecturer",
        lecturer_code=settings.LECTURER_CODE,
    )
    resp = client.post("/auth/register", json=valid)
    assert resp.status_code == 200, resp.text
    assert resp.json()["user"]["role"] == "lecturer", resp.text
    claims = pyjwt.decode(resp.json()["access_token"], TEST_SECRET, algorithms=["HS256"])
    assert claims["role"] == "lecturer", claims
    print("  OK lecturer registration with the correct code works and role is in the JWT.")


def test_register_validation():
    short = dict(USER_A, email="short@example.com", password="short")
    resp = client.post("/auth/register", json=short)
    assert resp.status_code == 400, resp.text
    print("  OK short password gives 400.")

    no_consent = dict(USER_A, email="noconsent@example.com", consent=False)
    resp = client.post("/auth/register", json=no_consent)
    assert resp.status_code == 400, resp.text
    print("  OK no consent gives 400.")


def test_login():
    wrong = client.post("/auth/login", json={"email": USER_A["email"], "password": "wrongpass1", "role": "student"})
    assert wrong.status_code == 401, wrong.text
    print("  OK wrong password gives 401.")

    resp = client.post("/auth/login", json={"email": USER_A["email"], "password": USER_A["password"], "role": "student"})
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["access_token"]
    assert body["user"].get("last_login_at"), body["user"]
    me = client.get("/auth/me", headers=_auth_headers(body["access_token"]))
    assert me.status_code == 200, me.text
    assert me.json().get("last_login_at"), me.text
    print("  OK login works and sets last_login_at.")


def test_login_role_check():
    """Login with correct credentials but the WRONG role -> 403 with a helpful message."""
    # USER_A was registered as a student (default role).
    resp = client.post(
        "/auth/login",
        json={"email": USER_A["email"], "password": USER_A["password"], "role": "lecturer"},
    )
    assert resp.status_code == 403, resp.text
    detail = resp.json().get("detail", "")
    assert "student" in detail.lower(), f"Expected role hint in detail: {detail}"
    print("  OK signing in with the wrong role gives 403 with a role hint.")

    # Correct role must succeed.
    resp = client.post(
        "/auth/login",
        json={"email": USER_A["email"], "password": USER_A["password"], "role": "student"},
    )
    assert resp.status_code == 200, resp.text
    print("  OK signing in with the correct role gives 200.")

    # Unknown role -> 400 (no credentials check at all).
    resp = client.post(
        "/auth/login",
        json={"email": USER_A["email"], "password": USER_A["password"], "role": "admin"},
    )
    assert resp.status_code == 400, resp.text
    print("  OK an unknown role value gives 400.")


def test_me_and_protected_route():
    token = client.post("/auth/login", json={"email": USER_A["email"], "password": USER_A["password"], "role": "student"}).json()["access_token"]

    resp = client.get("/auth/me", headers=_auth_headers(token))
    assert resp.status_code == 200, resp.text
    assert resp.json()["email"] == USER_A["email"]
    print("  OK /auth/me works with the token.")

    resp = client.get("/sessions")
    assert resp.status_code == 401, resp.text
    print("  OK protected route without a token gives 401.")


def test_bad_tokens():
    token = client.post("/auth/login", json={"email": USER_A["email"], "password": USER_A["password"], "role": "student"}).json()["access_token"]

    # Tampered: flip one character in the middle of the token.
    mid = len(token) // 2
    tampered = token[:mid] + ("A" if token[mid] != "A" else "B") + token[mid + 1:]
    resp = client.get("/auth/me", headers=_auth_headers(tampered))
    assert resp.status_code == 401, resp.text
    print("  OK tampered token gives 401.")

    # Expired: exp in the past, signed with the same secret.
    now = datetime.now(timezone.utc)
    expired = pyjwt.encode(
        {
            "sub": "1",
            "email": USER_A["email"],
            "iat": int((now - timedelta(hours=2)).timestamp()),
            "exp": int((now - timedelta(hours=1)).timestamp()),
        },
        TEST_SECRET,
        algorithm="HS256",
    )
    resp = client.get("/auth/me", headers=_auth_headers(expired))
    assert resp.status_code == 401, resp.text
    print("  OK expired token gives 401.")

    # Signed with a different secret.
    forged = pyjwt.encode(
        {
            "sub": "1",
            "email": USER_A["email"],
            "iat": int(now.timestamp()),
            "exp": int((now + timedelta(hours=1)).timestamp()),
        },
        "another-secret-" + "y" * 50,
        algorithm="HS256",
    )
    resp = client.get("/auth/me", headers=_auth_headers(forged))
    assert resp.status_code == 401, resp.text
    print("  OK token signed with a different secret gives 401.")


def test_session_ownership():
    assert client.post("/auth/register", json=USER_B).status_code == 200
    token_a = client.post("/auth/login", json={"email": USER_A["email"], "password": USER_A["password"], "role": "student"}).json()["access_token"]
    token_b = client.post("/auth/login", json={"email": USER_B["email"], "password": USER_B["password"], "role": "student"}).json()["access_token"]

    # User A creates a session.
    atlas_output = {
        "topic": "OOP",
        "learning_objectives": ["Understand classes"],
        "misconceptions": [
            {"wrong_concept": "A class is an instance.", "correct_concept": "A class is a blueprint.", "reason": "r"}
        ],
    }
    resp = client.post("/sessions/create-nova", json={"atlas_output": atlas_output}, headers=_auth_headers(token_a))
    assert resp.status_code == 200, resp.text
    session_id = resp.json()["session_id"]

    # Owner can read it.
    resp = client.get(f"/sessions/{session_id}", headers=_auth_headers(token_a))
    assert resp.status_code == 200, resp.text
    assert resp.json()["owner_id"]

    # Second user is refused.
    resp = client.get(f"/sessions/{session_id}", headers=_auth_headers(token_b))
    assert resp.status_code == 403, resp.text
    print("  OK a second user gets 403 on the first user's session.")

    # The listing shows only A's session.
    resp = client.get("/sessions", headers=_auth_headers(token_a))
    assert resp.status_code == 200, resp.text
    listed = [s["session_id"] for s in resp.json()]
    assert session_id in listed
    resp = client.get("/sessions", headers=_auth_headers(token_b))
    assert session_id not in [s["session_id"] for s in resp.json()]
    print("  OK GET /sessions returns only the current user's sessions.")

    # Clean up the session file created in the real sessions folder.
    from app.main import SESSIONS_DIR
    session_file = os.path.join(SESSIONS_DIR, f"{session_id}.json")
    if os.path.exists(session_file):
        os.remove(session_file)


def run_test():
    print("==========================================================")
    print("TEST: JWT authentication (register/login/protected routes)")
    print("==========================================================")
    print(f"  (temporary MongoDB database: {TEST_DB_NAME})")

    test_register_and_duplicate_email()
    test_lecturer_registration()
    test_register_validation()
    test_login()
    test_login_role_check()
    test_me_and_protected_route()
    test_bad_tokens()
    test_session_ownership()

    # Atlas users often cannot drop a whole database; removing the collection
    # is enough and is permitted for the database's own user.
    try:
        database = auth._get_client()[TEST_DB_NAME]
        database["users"].drop()
        database["counters"].drop()
    except Exception as exc:  # pragma: no cover - cleanup only
        print(f"  (warning: could not drop test collections: {exc})")

    print("\n==========================================================")
    print("SUCCESS: JWT authentication verified working!")
    print("==========================================================")


if __name__ == "__main__":
    run_test()
