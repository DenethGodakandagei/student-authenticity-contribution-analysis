"""
Lecturer-only routes (prefix: /lecturer).

Every route requires a valid JWT with ``role == "lecturer"``; the
``require_lecturer`` dependency in app/auth.py raises 403 for anyone else.

Data sources
------------
- **Users**: MongoDB ``users`` collection (via auth helpers).  Only documents
  with ``role == "student"`` are surfaced; password_hash and salt are never
  returned.
- **Sessions**: JSON files in SESSIONS_DIR (same directory used by main.py).
  Aggregated using the ``is_corrected`` flag, exactly like ``list_sessions``
  in main.py.  ``conversation_history`` is never included in any response.
"""
import json
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException

from app.auth import _get_users, _public_user, require_lecturer

# ---------------------------------------------------------------------------
# Router - every endpoint inherits the require_lecturer dependency.
# ---------------------------------------------------------------------------

router = APIRouter(
    prefix="/lecturer",
    tags=["lecturer"],
    dependencies=[Depends(require_lecturer)],
)

# ---------------------------------------------------------------------------
# Resolve SESSIONS_DIR the same way main.py does.
# ---------------------------------------------------------------------------
_BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SESSIONS_DIR = os.path.join(_BASE_DIR, "sessions")


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _all_students() -> List[Dict[str, Any]]:
    """Returns public dicts for every user whose role is 'student'."""
    docs = _get_users().find({"role": "student"})
    return [_public_user(doc) for doc in docs]


def _all_sessions() -> List[Dict[str, Any]]:
    """Loads every session JSON from SESSIONS_DIR (conversation_history stripped)."""
    sessions: List[Dict[str, Any]] = []
    if not os.path.isdir(SESSIONS_DIR):
        return sessions
    for fname in os.listdir(SESSIONS_DIR):
        if not fname.endswith(".json"):
            continue
        path = os.path.join(SESSIONS_DIR, fname)
        try:
            with open(path, "r", encoding="utf-8") as fh:
                state = json.load(fh)
        except (OSError, json.JSONDecodeError):
            continue
        # Strip conversation history - never expose it from lecturer routes.
        state.pop("conversation_history", None)
        sessions.append(state)
    return sessions


def _sessions_for_owner(owner_id: str) -> List[Dict[str, Any]]:
    return [s for s in _all_sessions() if s.get("owner_id") == owner_id]


def _session_summary(state: Dict[str, Any]) -> Dict[str, Any]:
    """Projects a session state dict into the lecturer-facing summary shape."""
    misconceptions = state.get("misconceptions", [])
    return {
        "session_id": state.get("session_id", ""),
        "topic": state.get("topic", ""),
        "created_at": state.get("created_at"),
        "updated_at": state.get("updated_at"),
        "learned_count": sum(1 for m in misconceptions if m.get("is_corrected")),
        "total_count": len(misconceptions),
    }


def _student_stats(student: Dict[str, Any], sessions: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Merges a student public dict with aggregated session stats."""
    owner_id = str(student["id"])
    own = [s for s in sessions if s.get("owner_id") == owner_id]

    misconceptions_total = 0
    misconceptions_corrected = 0
    last_active: Optional[str] = None

    for s in own:
        for m in s.get("misconceptions", []):
            misconceptions_total += 1
            if m.get("is_corrected"):
                misconceptions_corrected += 1
        updated = s.get("updated_at") or s.get("created_at")
        if updated and (last_active is None or updated > last_active):
            last_active = updated

    rate = (
        misconceptions_corrected / misconceptions_total
        if misconceptions_total > 0
        else 0.0
    )
    return {
        "id": student["id"],
        "name": student["name"],
        "student_id": student.get("student_id"),
        "anonymous_id": student.get("anonymous_id"),
        "session_count": len(own),
        "misconceptions_total": misconceptions_total,
        "misconceptions_corrected": misconceptions_corrected,
        "correction_rate": round(rate, 4),
        "last_active": last_active,
    }


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/overview")
def get_overview() -> Dict[str, Any]:
    """Aggregated stats across all students and sessions."""
    students = _all_students()
    sessions = _all_sessions()

    student_ids = {str(s["id"]) for s in students}

    total_sessions = sum(
        1 for sess in sessions if sess.get("owner_id") in student_ids
    )

    total_misconceptions = 0
    total_corrected = 0
    for sess in sessions:
        if sess.get("owner_id") not in student_ids:
            continue
        for m in sess.get("misconceptions", []):
            total_misconceptions += 1
            if m.get("is_corrected"):
                total_corrected += 1

    correction_rate = (
        total_corrected / total_misconceptions if total_misconceptions > 0 else 0.0
    )

    # "Active in the last 7 days" = at least one session updated in that window.
    cutoff = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    active_ids: set = set()
    for sess in sessions:
        if sess.get("owner_id") not in student_ids:
            continue
        updated = sess.get("updated_at") or sess.get("created_at") or ""
        if updated >= cutoff:
            active_ids.add(sess.get("owner_id"))

    return {
        "total_students": len(students),
        "total_sessions": total_sessions,
        "total_misconceptions": total_misconceptions,
        "total_corrected": total_corrected,
        "correction_rate": round(correction_rate, 4),
        "active_last_7_days": len(active_ids),
    }


@router.get("/students")
def list_students() -> List[Dict[str, Any]]:
    """Lists every student with aggregated session / misconception stats."""
    students = _all_students()
    sessions = _all_sessions()
    return [_student_stats(s, sessions) for s in students]


@router.get("/students/{user_id}/sessions")
def get_student_sessions(user_id: str) -> List[Dict[str, Any]]:
    """Returns session summaries for one specific student.

    Only sessions owned by *user_id* are returned; each entry contains
    session_id, topic, timestamps, learned_count, and total_count.
    No conversation_history is ever included.
    """
    from bson import ObjectId
    from bson.errors import InvalidId

    try:
        oid = ObjectId(user_id)
    except (InvalidId, TypeError, ValueError):
        raise HTTPException(status_code=404, detail="Student not found.")

    doc = _get_users().find_one({"_id": oid, "role": "student"})
    if doc is None:
        raise HTTPException(status_code=404, detail="Student not found.")

    sessions = _sessions_for_owner(user_id)
    return [_session_summary(s) for s in sessions]
