"""
MongoDB Atlas Real-Time Telemetry Data Ingestion Module (src/db.py)
-------------------------------------------------------------------
Connects directly to MongoDB Atlas to fetch live, real-time student telemetry
sessions and calculate continuous authenticity predictions.
"""

import os
import sys
import datetime
import pandas as pd
from typing import Tuple, Dict, Any, List
from pymongo import MongoClient


def format_local_time(dt_val) -> str:
    """
    Converts raw UTC datetimes stored in MongoDB Atlas to the real local system time (UTC+05:30).
    """
    if not dt_val:
        return "N/A"
    if isinstance(dt_val, str):
        try:
            dt_val = datetime.datetime.fromisoformat(dt_val.replace("Z", "+00:00"))
        except Exception:
            return dt_val
    if isinstance(dt_val, datetime.datetime):
        if dt_val.tzinfo is None:
            # MongoDB stores native datetimes in UTC
            dt_val = dt_val.replace(tzinfo=datetime.timezone.utc)
        local_dt = dt_val.astimezone()
        return local_dt.strftime("%Y-%m-%d %I:%M %p")
    return str(dt_val)

try:
    from .config import FEATURE_COLUMNS, DEFAULT_DATA_PATH
    from .predict import load_model_bundle, predict_authenticity
except ImportError:
    from config import FEATURE_COLUMNS, DEFAULT_DATA_PATH
    from predict import load_model_bundle, predict_authenticity


# Helper to find MONGO_URI
def get_mongo_uri() -> str:
    # 1. Environment variable
    if os.environ.get("MONGO_URI"):
        return os.environ.get("MONGO_URI")

    # 2. Check backend/.env
    curr_dir = os.path.dirname(os.path.abspath(__file__))
    backend_env = os.path.abspath(os.path.join(curr_dir, "..", "..", "backend", ".env"))
    if os.path.exists(backend_env):
        with open(backend_env, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line.startswith("MONGO_URI="):
                    return line.split("=", 1)[1].strip()

    # Default fallback
    return "mongodb+srv://root:root@cluster0.zufjtmd.mongodb.net/?appName=Cluster0"


def fetch_live_sessions_from_db(
    exclude_mock: bool = False,
    limit: int = 500
) -> Tuple[pd.DataFrame, bool, str]:
    """
    Fetches real telemetry sessions directly from MongoDB Atlas vscodesessions collection.
    Returns:
        (df: pd.DataFrame, is_live_db: bool, message: str)
    """
    mongo_uri = get_mongo_uri()
    mock_emails = {
        "alex.rivera@student.edu",
        "chloe.chen@student.edu",
        "marcus.vance@student.edu",
        "emma.watson@student.edu"
    }

    try:
        client = MongoClient(mongo_uri, serverSelectionTimeoutMS=4000)
        db = client.test

        # Verify connectivity
        client.admin.command("ping")

        # In-memory batch lookups (extremely fast, ~1-2 sec)
        users = {str(u["_id"]): u for u in db.users.find({}, {"name": 1, "email": 1})}
        assignments = {str(a["_id"]): a for a in db.assignments.find({}, {"title": 1})}
        teams = {str(t["_id"]): t for t in db.teams.find({}, {"name": 1})}

        cursor = db.vscodesessions.find({}).sort("sessionStart", -1).limit(limit)
        raw_sessions = list(cursor)

        if not raw_sessions:
            return _load_fallback_csv("Database connected, but no session records found.")

        bundle = load_model_bundle()
        rows = []

        for s in raw_sessions:
            u = users.get(str(s.get("student")), {})
            email = u.get("email", "")
            if exclude_mock and email in mock_emails:
                continue

            student_name = u.get("name", "Student")
            assign_title = assignments.get(str(s.get("assignment")), {}).get("title", "Practical Assignment")
            team_name = teams.get(str(s.get("team")), {}).get("name", "Team")

            dur = max(0.5, float(s.get("durationMinutes") or 1.0))
            keys = int(s.get("keystrokes") or 0)
            added = int(s.get("linesAdded") or 0)
            removed = int(s.get("linesRemoved") or 0)
            net = added - removed
            total_churn_lines = added + removed
            churn = round(removed / total_churn_lines, 4) if total_churn_lines > 0 else 0.0

            paste_cnt = int(s.get("pasteCount") or 0)
            chars_pasted = int(s.get("charactersPasted") or 0)

            total_chars = max(1, keys + chars_pasted)
            paste_ratio = round(chars_pasted / total_chars, 4)
            cpm = round(keys / dur, 2)
            keff = round(keys / added, 2) if added > 0 else (round(float(keys), 2) if keys > 0 else 0.0)

            # Deep Safeguard: Catch anomalous sessions where human typing speed exceeds biological limit (>300 CPM for >= 5 lines) or provenance denotes paste
            prov = s.get("codingProvenance") or {}
            prov_paste_pct = float(prov.get("pastePercent") or 0)
            if (prov_paste_pct > 50 or (cpm > 300 and added >= 5)) and chars_pasted == 0:
                chars_pasted = keys
                keys = min(5, added)
                paste_cnt = max(1, paste_cnt)
                total_chars = max(1, keys + chars_pasted)
                paste_ratio = round(chars_pasted / total_chars, 4)
                cpm = round(keys / dur, 2)
                keff = round(keys / added, 2) if added > 0 else 0.0

            files_edited = s.get("filesEdited") or []
            files_cnt = len(files_edited)
            primary_file = files_edited[0] if files_edited else "none"

            # Telemetry Feature Vector for ML Classifier
            feat = {
                "duration_minutes": float(dur),
                "keystrokes": int(keys),
                "lines_added": int(added),
                "lines_removed": int(removed),
                "net_lines": int(net),
                "code_churn_ratio": float(churn),
                "paste_count": int(paste_cnt),
                "characters_pasted": int(chars_pasted),
                "typing_speed_cpm": float(cpm),
                "keystroke_efficiency_keff": float(keff),
                "paste_ratio": float(paste_ratio),
                "is_offline": 1 if s.get("isOffline") else 0,
                "files_edited_count": int(files_cnt)
            }

            pred = predict_authenticity(feat, model_bundle=bundle)

            s_start = s.get("sessionStart")
            start_str = format_local_time(s_start)

            rows.append({
                "Session ID": str(s["_id"]),
                "Student Name": student_name,
                "Student Email": email,
                "Assignment": assign_title,
                "Team": team_name,
                "Session Start": start_str,
                "Session Start (Local Time)": start_str,
                "Duration (min)": dur,
                "Keystrokes": keys,
                "Lines Added": added,
                "Lines Removed": removed,
                "Net Lines": net,
                "Churn Ratio": churn,
                "Paste Count": paste_cnt,
                "Chars Pasted": chars_pasted,
                "Paste Ratio": paste_ratio,
                "Typing CPM": cpm,
                "K-Eff (keys/line)": keff,
                "Files Edited": files_cnt,
                "Primary File": primary_file,
                "Authenticity Score": f"{pred.get('authenticity_score_percent', 95.0):.1f}%",
                "Suspicion Score": f"{pred.get('suspicion_score_percent', 5.0):.1f}%",
                "Risk Tier": pred.get("risk_tier", "Low Risk (Authentic Human)"),
                "Review Status": pred.get("status", "Verified Authentic"),
                # Raw numeric columns for filtering/charting
                "_auth_pct": pred.get("authenticity_score_percent", 95.0),
                "_susp_pct": pred.get("suspicion_score_percent", 5.0),
                "_is_authentic": pred.get("is_authentic", True),
                "_is_anomaly": pred.get("is_anomaly", False),
                "_feat_dict": feat
            })

        df = pd.DataFrame(rows)
        return df, True, f"Live MongoDB Atlas Connected: {len(df)} real student sessions retrieved."

    except Exception as e:
        return _load_fallback_csv(f"Could not connect to MongoDB Atlas ({e}). Loaded local dataset.csv.")


def _load_fallback_csv(reason: str) -> Tuple[pd.DataFrame, bool, str]:
    """
    Fallback loader reading component1/ml_model/data/dataset.csv if database offline.
    """
    if not os.path.exists(DEFAULT_DATA_PATH):
        return pd.DataFrame(), False, f"Error: Dataset not found at '{DEFAULT_DATA_PATH}'."

    df_raw = pd.read_csv(DEFAULT_DATA_PATH)
    bundle = load_model_bundle()

    rows = []
    for _, s in df_raw.iterrows():
        dur = max(0.5, float(s.get("duration_minutes", 1.0)))
        keys = int(s.get("keystrokes", 0))
        added = int(s.get("lines_added", 0))
        removed = int(s.get("lines_removed", 0))
        net = int(s.get("net_lines", added - removed))
        total_churn = added + removed
        churn = round(removed / total_churn, 4) if total_churn > 0 else 0.0
        paste_cnt = int(s.get("paste_count", 0))
        chars_pasted = int(s.get("characters_pasted", 0))
        cpm = round(float(s.get("typing_speed_cpm", keys / dur)), 2)
        keff = round(float(s.get("keystroke_efficiency_keff", keys / max(1, added))), 2)
        p_ratio = round(float(s.get("paste_ratio", chars_pasted / max(1, keys + chars_pasted))), 4)

        feat = {
            "duration_minutes": dur,
            "keystrokes": keys,
            "lines_added": added,
            "lines_removed": removed,
            "net_lines": net,
            "code_churn_ratio": churn,
            "paste_count": paste_cnt,
            "characters_pasted": chars_pasted,
            "typing_speed_cpm": cpm,
            "keystroke_efficiency_keff": keff,
            "paste_ratio": p_ratio,
            "is_offline": int(s.get("is_offline", 0)),
            "files_edited_count": int(s.get("files_edited_count", 1))
        }

        pred = predict_authenticity(feat, model_bundle=bundle)

        rows.append({
            "Session ID": str(s.get("session_id", "")),
            "Student Name": str(s.get("student_name", "Student")),
            "Student Email": str(s.get("student_email", "")),
            "Assignment": str(s.get("assignment_title", "Assignment")),
            "Team": str(s.get("team_name", "Team")),
            "Session Start": format_local_time(s.get("session_start_iso", "")),
            "Session Start (Local Time)": format_local_time(s.get("session_start_iso", "")),
            "Duration (min)": dur,
            "Keystrokes": keys,
            "Lines Added": added,
            "Lines Removed": removed,
            "Net Lines": net,
            "Churn Ratio": churn,
            "Paste Count": paste_cnt,
            "Chars Pasted": chars_pasted,
            "Paste Ratio": p_ratio,
            "Typing CPM": cpm,
            "K-Eff (keys/line)": keff,
            "Files Edited": int(s.get("files_edited_count", 1)),
            "Primary File": str(s.get("primary_file", "main.py")),
            "Authenticity Score": f"{pred.get('authenticity_score_percent', 95.0):.1f}%",
            "Suspicion Score": f"{pred.get('suspicion_score_percent', 5.0):.1f}%",
            "Risk Tier": pred.get("risk_tier", "Low Risk (Authentic Human)"),
            "Review Status": pred.get("status", "Verified Authentic"),
            "_auth_pct": pred.get("authenticity_score_percent", 95.0),
            "_susp_pct": pred.get("suspicion_score_percent", 5.0),
            "_is_authentic": pred.get("is_authentic", True),
            "_is_anomaly": pred.get("is_anomaly", False),
            "_feat_dict": feat
        })

    return pd.DataFrame(rows), False, f"Fallback mode active: {reason}"
