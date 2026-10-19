"""
Adds authentication-related fields to existing users.

Run from the backend directory: python migrate_users.py

Only missing values are written; existing values are never overwritten.
Anonymous ids come from the same atomic ``counters`` document used at
registration, so newly assigned ids stay unique.
"""
import re
import sys

# pyrefly: ignore [missing-import]
from pymongo import MongoClient, ReturnDocument
from pymongo.errors import PyMongoError

from app.config import settings

DEFAULT_ROLE = "student"
DEFAULT_COHORT_ID = "OOP-2026"
DEFAULT_CONSENT_VERSION = "v1"
ANONYMOUS_ID_COUNTER = "anonymous_id"
_ANONYMOUS_ID_RE = re.compile(r"^P-(\d+)$")


def _next_anonymous_id(counters) -> str:
    counter = counters.find_one_and_update(
        {"_id": ANONYMOUS_ID_COUNTER},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    return f"P-{int(counter['seq']):04d}"


def _seed_counter_past_existing(users, counters) -> None:
    """Moves the counter past any anonymous ids already present in users."""
    highest = 0
    for doc in users.find({"anonymous_id": {"$type": "string"}}, {"anonymous_id": 1}):
        match = _ANONYMOUS_ID_RE.match(doc.get("anonymous_id", ""))
        if match:
            highest = max(highest, int(match.group(1)))
    if highest:
        counters.update_one(
            {"_id": ANONYMOUS_ID_COUNTER},
            {"$max": {"seq": highest}},
            upsert=True,
        )


def migrate() -> int:
    """Adds missing fields and returns how many user documents were updated."""
    if not settings.MONGO_URI:
        raise RuntimeError(
            "MONGO_URI is missing. Set MONGO_URI in backend/.env to your "
            "MongoDB connection string."
        )

    client = MongoClient(settings.MONGO_URI, serverSelectionTimeoutMS=5000)
    database = client[settings.MONGO_DB_NAME]
    users = database["users"]
    counters = database["counters"]

    _seed_counter_past_existing(users, counters)

    updated = 0
    for doc in users.find({}):
        changes = {}
        if not doc.get("role"):
            changes["role"] = DEFAULT_ROLE
        if not doc.get("anonymous_id"):
            changes["anonymous_id"] = _next_anonymous_id(counters)
        if not doc.get("cohort_id"):
            changes["cohort_id"] = DEFAULT_COHORT_ID
        if not doc.get("consent_version"):
            changes["consent_version"] = DEFAULT_CONSENT_VERSION

        if changes:
            users.update_one({"_id": doc["_id"]}, {"$set": changes})
            updated += 1

    return updated


def main() -> None:
    try:
        updated = migrate()
    except PyMongoError as exc:
        print(f"Migration failed: {exc}")
        sys.exit(1)
    print(f"Updated {updated} user(s).")


if __name__ == "__main__":
    main()
