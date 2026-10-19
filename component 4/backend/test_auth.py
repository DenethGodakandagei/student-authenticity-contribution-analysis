"""
Tests for JWT auth: registration, login, protected routes, session ownership.

Uses a temporary SQLite database file and a temporary JWT_SECRET, so the real
backend/data/users.db and the real .env secret are untouched.

Run: python test_auth.py
"""
import os
import sys
import tempfile
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

from app import auth
from app.main import app

# Temporary database file for this test run only.
_tmpdir = tempfile.mkdtemp(prefix="nova-auth-test-")
auth.DB_PATH = os.path.join(_tmpdir, "users.db")

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
    print("  OK register works and returns an access_token.")

    dup = client.post("/auth/register", json=USER_A)
    assert dup.status_code == 409, dup.text
    print("  OK duplicate email gives 409.")


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
    wrong = client.post("/auth/login", json={"email": USER_A["email"], "password": "wrongpass1"})
    assert wrong.status_code == 401, wrong.text
    print("  OK wrong password gives 401.")

    resp = client.post("/auth/login", json={"email": USER_A["email"], "password": USER_A["password"]})
    assert resp.status_code == 200, resp.text
    assert resp.json()["access_token"]
    print("  OK login works.")


def test_me_and_protected_route():
    token = client.post("/auth/login", json={"email": USER_A["email"], "password": USER_A["password"]}).json()["access_token"]

    resp = client.get("/auth/me", headers=_auth_headers(token))
    assert resp.status_code == 200, resp.text
    assert resp.json()["email"] == USER_A["email"]
    print("  OK /auth/me works with the token.")

    resp = client.get("/sessions")
    assert resp.status_code == 401, resp.text
    print("  OK protected route without a token gives 401.")


def test_bad_tokens():
    token = client.post("/auth/login", json={"email": USER_A["email"], "password": USER_A["password"]}).json()["access_token"]

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
    token_a = client.post("/auth/login", json={"email": USER_A["email"], "password": USER_A["password"]}).json()["access_token"]
    token_b = client.post("/auth/login", json={"email": USER_B["email"], "password": USER_B["password"]}).json()["access_token"]

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
    print(f"  (temporary DB: {auth.DB_PATH})")

    test_register_and_duplicate_email()
    test_register_validation()
    test_login()
    test_me_and_protected_route()
    test_bad_tokens()
    test_session_ownership()

    import shutil
    shutil.rmtree(_tmpdir, ignore_errors=True)

    print("\n==========================================================")
    print("SUCCESS: JWT authentication verified working!")
    print("==========================================================")


if __name__ == "__main__":
    run_test()
