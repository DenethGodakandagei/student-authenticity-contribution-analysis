"""
Authentication: user registration/login with stateless JWT access tokens.

- Passwords: PBKDF2-HMAC-SHA256 (hashlib) with a per-user random salt;
  constant-time comparison via hmac.compare_digest.
- Users: MongoDB collection `users` in the database named by MONGO_DB_NAME.
  There is NO tokens collection because JWTs are stateless - the token itself
  carries the identity.
- Tokens: signed with PyJWT (HS256); verified by the get_current_user dependency.

MongoDB is used for authentication only. All other application data (sessions,
uploads, knowledge bases) keeps its existing file-based storage.
"""
import hashlib
import hmac
import re
import secrets
import threading
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

# pyrefly: ignore [missing-import]
import jwt
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from pymongo import ASCENDING, MongoClient, ReturnDocument
from pymongo.collection import Collection
from pymongo.errors import DuplicateKeyError, PyMongoError

from app.config import settings

DEFAULT_ROLE = "student"
DEFAULT_COHORT_ID = "OOP-2026"
DEFAULT_CONSENT_VERSION = "v1"
VALID_ROLES = ("student", "lecturer")
_ANONYMOUS_ID_COUNTER = "anonymous_id"

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

PBKDF2_ITERATIONS = 200_000
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

_bearer = HTTPBearer(auto_error=False)
router = APIRouter(prefix="/auth", tags=["auth"])

# ---------------------------------------------------------------------------
# MongoDB connection (lazy, thread-safe, reused across requests)
# ---------------------------------------------------------------------------
_client: Optional[MongoClient] = None
_client_lock = threading.Lock()
_indexed_collections: set = set()


def _get_client() -> MongoClient:
    """Returns the shared MongoClient, creating it on first use."""
    global _client
    if _client is None:
        with _client_lock:
            if _client is None:
                if not settings.MONGO_URI:
                    raise RuntimeError(
                        "MONGO_URI is missing. Set MONGO_URI in backend/.env to your "
                        "MongoDB connection string."
                    )
                _client = MongoClient(settings.MONGO_URI, serverSelectionTimeoutMS=5000)
    return _client


def _get_users() -> Collection:
    """Returns the users collection, ensuring its unique email index exists."""
    collection = _get_client()[settings.MONGO_DB_NAME]["users"]
    key = f"{settings.MONGO_DB_NAME}.users"
    if key not in _indexed_collections:
        with _client_lock:
            if key not in _indexed_collections:
                collection.create_index(
                    [("email", ASCENDING)],
                    unique=True,
                    name="uniq_email",
                )
                _indexed_collections.add(key)
    return collection


def _next_anonymous_id() -> str:
    """Atomically increments the counter and returns an id like ``P-0001``."""
    counters = _get_client()[settings.MONGO_DB_NAME]["counters"]
    counter = counters.find_one_and_update(
        {"_id": _ANONYMOUS_ID_COUNTER},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    return f"P-{int(counter['seq']):04d}"


def check_connection() -> None:
    """Pings MongoDB so configuration problems surface early."""
    try:
        _get_client().admin.command("ping")
    except PyMongoError as exc:
        raise RuntimeError(f"Unable to connect to MongoDB: {exc}") from exc


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    student_id: Optional[str] = None
    consent: bool = False
    role: Optional[str] = None
    lecturer_code: Optional[str] = None


class LoginRequest(BaseModel):
    email: str
    password: str


# ---------------------------------------------------------------------------
# MongoDB helpers
# ---------------------------------------------------------------------------

def _public_user(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Converts a users document to a public dict (never includes password_hash or salt)."""
    return {
        "id": str(doc["_id"]),
        "name": doc["name"],
        "email": doc["email"],
        "student_id": doc.get("student_id"),
        "role": doc.get("role", DEFAULT_ROLE),
        "anonymous_id": doc.get("anonymous_id"),
        "cohort_id": doc.get("cohort_id", DEFAULT_COHORT_ID),
        "consent_version": doc.get("consent_version", DEFAULT_CONSENT_VERSION),
        "consent_at": doc.get("consent_at"),
        "last_login_at": doc.get("last_login_at"),
        "created_at": doc.get("created_at"),
    }


def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    """Fetches a user by lowercase email; returns a public dict or None."""
    doc = _get_users().find_one({"email": email})
    return _public_user(doc) if doc else None


def get_user_by_id(user_id: Any) -> Optional[Dict[str, Any]]:
    """Fetches a user by id (ObjectId string); returns a public dict or None."""
    try:
        oid = ObjectId(str(user_id))
    except (InvalidId, TypeError, ValueError):
        return None
    doc = _get_users().find_one({"_id": oid})
    return _public_user(doc) if doc else None


def _get_credentials_by_id(user_id: ObjectId) -> Optional[Dict[str, Any]]:
    return _get_users().find_one({"_id": user_id})


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

def create_user(
    name: str,
    email: str,
    password: str,
    student_id: Optional[str] = None,
    role: str = DEFAULT_ROLE,
) -> Dict[str, Any]:
    """Inserts a new user and returns the public user dict. Email must be unique."""
    salt = secrets.token_bytes(16)
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "name": name,
        "email": email,
        "student_id": student_id,
        "role": role,
        "anonymous_id": _next_anonymous_id(),
        "cohort_id": DEFAULT_COHORT_ID,
        "consent_version": DEFAULT_CONSENT_VERSION,
        "password_hash": _hash_password(password, salt),
        "salt": salt.hex(),
        "consent_at": now,
        "last_login_at": None,
        "created_at": now,
    }
    result = _get_users().insert_one(doc)
    return _public_user(_get_credentials_by_id(result.inserted_id))


# ---------------------------------------------------------------------------
# JWT tokens (stateless - no tokens table)
# ---------------------------------------------------------------------------

def create_access_token(user: Dict[str, Any]) -> str:
    """Returns a signed JWT with claims: sub, email, role, iat, exp (UTC)."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user["id"]),
        "email": user["email"],
        "role": user.get("role", DEFAULT_ROLE),
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
    Decodes and verifies the bearer JWT, then loads the user from MongoDB.
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


def require_lecturer(
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Returns the current user only when their role is ``lecturer``; otherwise 403."""
    if current_user.get("role") != "lecturer":
        raise HTTPException(status_code=403, detail="Lecturer access required.")
    return current_user


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

    role = (req.role or DEFAULT_ROLE).strip().lower()
    if role not in VALID_ROLES:
        raise HTTPException(
            status_code=400,
            detail="Role must be either 'student' or 'lecturer'.",
        )
    if role == "lecturer":
        if not settings.LECTURER_CODE:
            raise HTTPException(
                status_code=403,
                detail="Lecturer registration is disabled: LECTURER_CODE is not configured.",
            )
        if not req.lecturer_code or not hmac.compare_digest(
            req.lecturer_code, settings.LECTURER_CODE
        ):
            raise HTTPException(status_code=403, detail="Invalid lecturer code.")

    try:
        user = create_user(name, email, req.password, req.student_id, role=role)
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="Email is already registered.")
    return {"access_token": create_access_token(user), "token_type": "bearer", "user": user}


@router.post("/login")
def login(req: LoginRequest) -> Dict[str, Any]:
    """Logs in a user; returns a bearer token. One generic error for bad credentials."""
    email = req.email.strip().lower()
    doc = _get_users().find_one({"email": email})

    if doc is None or not verify_password(req.password, doc["password_hash"], doc["salt"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    login_at = datetime.now(timezone.utc).isoformat()
    _get_users().update_one({"_id": doc["_id"]}, {"$set": {"last_login_at": login_at}})
    doc["last_login_at"] = login_at

    user = _public_user(doc)
    return {"access_token": create_access_token(user), "token_type": "bearer", "user": user}


@router.get("/me")
def read_me(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """Returns the currently authenticated user."""
    return current_user


@router.post("/logout")
def logout() -> Dict[str, str]:
    """JWTs are stateless: the client deletes the token; nothing changes server-side."""
    return {"message": "logged out"}
