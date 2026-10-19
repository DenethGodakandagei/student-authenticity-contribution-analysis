"""
Authentication: user registration/login with stateless JWT access tokens.

- Passwords: PBKDF2-HMAC-SHA256 (hashlib) with a per-user random salt;
  constant-time comparison via hmac.compare_digest.
- Users: SQLite at backend/data/users.db. There is NO tokens table because
  JWTs are stateless - the token itself carries the identity.
- Tokens: signed with PyJWT (HS256); verified by the get_current_user dependency.
"""
import hashlib
import hmac
import os
import re
import secrets
import sqlite3
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

# pyrefly: ignore [missing-import]
import jwt
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from app.config import settings

# ---------------------------------------------------------------------------
# Startup guard: refuse to run with a missing or weak JWT secret.
# (Never print or log the secret itself.)
# ---------------------------------------------------------------------------
if len(settings.JWT_SECRET or "") < 32:
    raise RuntimeError(
        "JWT_SECRET is missing or shorter than 32 characters. "
        "Set JWT_SECRET in backend/.env, for example: "
        "JWT_SECRET=<64 random characters> (e.g. output of python -c \"import secrets; print(secrets.token_urlsafe(48))\")"
    )

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
DB_PATH = os.path.join(DATA_DIR, "users.db")

PBKDF2_ITERATIONS = 200_000
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

_bearer = HTTPBearer(auto_error=False)
router = APIRouter(prefix="/auth", tags=["auth"])


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    student_id: Optional[str] = None
    consent: bool = False


class LoginRequest(BaseModel):
    email: str
    password: str


# ---------------------------------------------------------------------------
# SQLite storage
# ---------------------------------------------------------------------------

def _get_conn() -> sqlite3.Connection:
    """Opens a connection to the users database, creating folder/table if needed."""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            student_id TEXT,
            password_hash TEXT NOT NULL,
            salt TEXT NOT NULL,
            consent_at TEXT,
            created_at TEXT NOT NULL
        )
        """
    )
    conn.commit()
    return conn


def _public_user(row: sqlite3.Row) -> Dict[str, Any]:
    """Converts a users row to a public dict (never includes password_hash or salt)."""
    return {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"],
        "student_id": row["student_id"],
        "consent_at": row["consent_at"],
        "created_at": row["created_at"],
    }


def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    """Fetches a user by lowercase email; returns a public dict or None."""
    with _get_conn() as conn:
        row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    return _public_user(row) if row else None


def get_user_by_id(user_id: Any) -> Optional[Dict[str, Any]]:
    """Fetches a user by id; returns a public dict or None."""
    try:
        uid = int(user_id)
    except (TypeError, ValueError):
        return None
    with _get_conn() as conn:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (uid,)).fetchone()
    return _public_user(row) if row else None


def _get_credentials_by_id(user_id: int) -> Optional[sqlite3.Row]:
    with _get_conn() as conn:
        return conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()


# ---------------------------------------------------------------------------
# Password hashing (PBKDF2-HMAC-SHA256, stdlib only)
# ---------------------------------------------------------------------------

def _hash_password(password: str, salt: bytes) -> str:
    """Derives a hex password hash with PBKDF2-HMAC-SHA256."""
    return hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PBKDF2_ITERATIONS).hex()


def verify_password(password: str, password_hash: str, salt_hex: str) -> bool:
    """Constant-time password check against the stored hash and salt."""
    candidate = _hash_password(password, bytes.fromhex(salt_hex))
    return hmac.compare_digest(candidate, password_hash)


# ---------------------------------------------------------------------------
# User registration / lookup
# ---------------------------------------------------------------------------

def create_user(name: str, email: str, password: str, student_id: Optional[str] = None) -> Dict[str, Any]:
    """Inserts a new user and returns the public user dict. Email must be unique."""
    salt = secrets.token_bytes(16)
    now = datetime.now(timezone.utc).isoformat()
    with _get_conn() as conn:
        cur = conn.execute(
            "INSERT INTO users (name, email, student_id, password_hash, salt, consent_at, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (name, email, student_id, _hash_password(password, salt), salt.hex(), now, now),
        )
        conn.commit()
        user_id = cur.lastrowid
    return _public_user(_get_credentials_by_id(user_id))


# ---------------------------------------------------------------------------
# JWT tokens (stateless - no tokens table)
# ---------------------------------------------------------------------------

def create_access_token(user: Dict[str, Any]) -> str:
    """Returns a signed JWT with claims: sub, email, iat, exp (UTC)."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user["id"]),
        "email": user["email"],
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)).timestamp()),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


# ---------------------------------------------------------------------------
# FastAPI dependency: resolve the current user from the Authorization header
# ---------------------------------------------------------------------------

def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> Dict[str, Any]:
    """
    Decodes and verifies the bearer JWT, then loads the user from the database.
    Raises 401 for missing, invalid, tampered or expired tokens and unknown users.
    """
    if credentials is None or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

    if not payload.get("sub") or not payload.get("exp"):
        raise HTTPException(status_code=401, detail="Invalid token")

    user = get_user_by_id(payload["sub"])
    if user is None:
        raise HTTPException(status_code=401, detail="User no longer exists")
    return user


# ---------------------------------------------------------------------------
# Auth routes
# ---------------------------------------------------------------------------

@router.post("/register")
def register(req: RegisterRequest) -> Dict[str, Any]:
    """Registers a new user and returns a bearer token."""
    name = req.name.strip()
    email = req.email.strip().lower()

    if not name:
        raise HTTPException(status_code=400, detail="Name must not be empty.")
    if not _EMAIL_RE.match(email):
        raise HTTPException(status_code=400, detail="Invalid email format.")
    if len(req.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")
    if not req.consent:
        raise HTTPException(status_code=400, detail="Consent is required to register.")
    if get_user_by_email(email) is not None:
        raise HTTPException(status_code=409, detail="Email is already registered.")

    user = create_user(name, email, req.password, req.student_id)
    return {"access_token": create_access_token(user), "token_type": "bearer", "user": user}


@router.post("/login")
def login(req: LoginRequest) -> Dict[str, Any]:
    """Logs in a user; returns a bearer token. One generic error for bad credentials."""
    email = req.email.strip().lower()
    row = None
    with _get_conn() as conn:
        row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()

    if row is None or not verify_password(req.password, row["password_hash"], row["salt"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    user = _public_user(row)
    return {"access_token": create_access_token(user), "token_type": "bearer", "user": user}


@router.get("/me")
def read_me(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """Returns the currently authenticated user."""
    return current_user


@router.post("/logout")
def logout() -> Dict[str, str]:
    """JWTs are stateless: the client deletes the token; nothing changes server-side."""
    return {"message": "logged out"}
