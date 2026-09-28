#!/usr/bin/env python3
"""
Feature Extraction Script (extract_features.py)
-----------------------------------------------
Reads raw telemetry events from MongoDB, local SQLite database, or backend mock store,
segments events into 5-minute sliding/tumbling windows, calculates behavioral features,
and exports the dataset to pilot_dataset.csv.

Supported Inputs:
1. SQLite Database: collabintel_telemetry.db (VS Code extension global storage)
2. MongoDB Atlas / Local MongoDB: TelemetryEvent collection
3. JSON Mock Store: backend/data/mock_store.json

Usage:
    python extract_features.py --help
    python extract_features.py --source sqlite --sqlite-path "<path_to_db>"
    python extract_features.py --source mongo --mongo-uri "mongodb://..."
    python extract_features.py --source mock --mock-path "./component1/backend/data/mock_store.json"
"""

import os
import sys
import json
import sqlite3
import csv
import argparse
from datetime import datetime, timezone
from typing import List, Dict, Any

DEFAULT_WINDOW_MINUTES = 5
DEFAULT_SLIDE_MINUTES = 5
DEFAULT_OUTPUT_CSV = "pilot_dataset.csv"

def parse_args():
    parser = argparse.ArgumentParser(description="Extract ML features from telemetry events into CSV.")
    parser.add_argument("--source", choices=["auto", "sqlite", "mongo", "mock"], default="auto",
                        help="Data source type (default: auto-detect)")
    parser.add_argument("--sqlite-path", type=str, default=None,
                        help="Path to SQLite collabintel_telemetry.db")
    parser.add_argument("--mongo-uri", type=str, default=None,
                        help="MongoDB Connection URI (defaults to MONGODB_URI env var)")
    parser.add_argument("--mock-path", type=str, default="./component1/backend/data/mock_store.json",
                        help="Path to backend mock_store.json")
    parser.add_argument("--output", type=str, default=DEFAULT_OUTPUT_CSV,
                        help=f"Output CSV path (default: {DEFAULT_OUTPUT_CSV})")
    parser.add_argument("--window-minutes", type=int, default=DEFAULT_WINDOW_MINUTES,
                        help=f"Window duration in minutes (default: {DEFAULT_WINDOW_MINUTES})")
    parser.add_argument("--slide-minutes", type=int, default=DEFAULT_SLIDE_MINUTES,
                        help=f"Step/slide interval in minutes (default: {DEFAULT_SLIDE_MINUTES})")
    parser.add_argument("--label-mode", choices=["auto", "manual", "session"], default="auto",
                        help="Label assignment strategy for genuine vs AI/pasted")
    return parser.parse_args()


def find_sqlite_db() -> str | None:
    """Attempt to locate local SQLite telemetry database."""
    candidates = [
        os.path.expanduser("~/.vscode/collabintel_telemetry.db"),
        os.path.expandvars(r"%APPDATA%\Code\User\globalStorage\collabintel.student-contribution-tracker\collabintel_telemetry.db"),
        os.path.expandvars(r"%APPDATA%\Code - Insiders\User\globalStorage\collabintel.student-contribution-tracker\collabintel_telemetry.db"),
        "./collabintel_telemetry.db",
        "./component1/vscode-extension/collabintel_telemetry.db"
    ]
    for path in candidates:
        if os.path.exists(path):
            return path
    return None


def fetch_from_sqlite(db_path: str) -> List[Dict[str, Any]]:
    print(f"[*] Reading telemetry events from SQLite: {db_path}")
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("""
        SELECT event_uuid, session_id, student_id, event_type, category,
               file_path, timestamp, payload_json, sync_status, row_hash
        FROM telemetry_events
        ORDER BY timestamp ASC
    """)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows


def fetch_from_mongo(mongo_uri: str) -> List[Dict[str, Any]]:
    try:
        from pymongo import MongoClient
    except ImportError:
        print("[!] pymongo is not installed. Run 'pip install pymongo' or use --source sqlite / mock", file=sys.stderr)
        sys.exit(1)
    
    print(f"[*] Connecting to MongoDB...")
    client = MongoClient(mongo_uri)
    db = client.get_default_database() or client["collabintel"]
    collection = db["telemetryevents"]
    
    events = list(collection.find({}, {
        "event_uuid": 1, "session_id": 1, "student_id": 1, "event_type": 1,
        "category": 1, "file_path": 1, "timestamp": 1, "payload_json": 1,
        "sync_status": 1, "row_hash": 1
    }).sort("timestamp", 1))
    
    print(f"[*] Retrieved {len(events)} events from MongoDB.")
    return events


def fetch_from_mock(mock_path: str) -> List[Dict[str, Any]]:
    if not os.path.exists(mock_path):
        print(f"[!] Mock store not found at {mock_path}", file=sys.stderr)
        return []
    print(f"[*] Reading events from mock store: {mock_path}")
    with open(mock_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    events = data.get("mockTelemetryEvents", [])
    events.sort(key=lambda e: e.get("timestamp", 0))
    return events


def calculate_window_features(events_in_window: List[Dict[str, Any]], session_id: str,
                              student_id: str, window_start_ms: int, window_end_ms: int,
                              window_index: int) -> Dict[str, Any]:
    """Calculate the core behavioral & authenticity features for a 5-minute window."""
    total_events = len(events_in_window)
    keystroke_count = 0
    paste_count = 0
    pasted_chars = 0
    manual_chars_inserted = 0
    chars_deleted = 0
    active_timestamps = []
    
    for evt in events_in_window:
        t = evt.get("timestamp", 0)
        active_timestamps.append(t)
        
        event_type = evt.get("event_type", "").upper()
        payload_raw = evt.get("payload_json", "{}")
        if isinstance(payload_raw, str):
            try:
                payload = json.loads(payload_raw)
            except Exception:
                payload = {}
        else:
            payload = payload_raw or {}
            
        char_count = int(payload.get("charCount", payload.get("chars_added", payload.get("insertedChars", 1))))
        net_inserted = int(payload.get("netInsertedChars", char_count))
        deleted = int(payload.get("deletedChars", 0))
        chars_deleted += deleted
        
        if event_type in ["PASTE_BURST", "PASTE"]:
            paste_count += 1
            pasted_chars += char_count
        elif event_type in ["KEYSTROKE", "TEXT_CHANGE", "DOCUMENT_CHANGE"]:
            # If charCount is large (> 20), classify as paste-like burst if not already flagged
            if char_count > 20:
                paste_count += 1
                pasted_chars += char_count
            else:
                keystroke_count += 1
                manual_chars_inserted += max(net_inserted, 1)

    # Active time calculation (sum of inter-event gaps < 60s)
    active_time_sec = 0.0
    if len(active_timestamps) > 1:
        active_timestamps.sort()
        for i in range(1, len(active_timestamps)):
            gap_sec = (active_timestamps[i] - active_timestamps[i-1]) / 1000.0
            if 0 < gap_sec <= 60.0:
                active_time_sec += gap_sec
    elif len(active_timestamps) == 1:
        active_time_sec = 5.0  # minimal single event active slice
        
    active_minutes = max(active_time_sec / 60.0, 0.05)
    typing_speed_cpm = round(manual_chars_inserted / active_minutes, 2)
    paste_velocity = round(pasted_chars / max(paste_count, 1), 2)
    total_content_chars = manual_chars_inserted + pasted_chars
    paste_ratio = round(pasted_chars / max(total_content_chars, 1), 4)

    # Label assignment rule:
    # Class 0 = Genuine Human Coding (High keystrokes, minimal paste ratio)
    # Class 1 = Pasted / AI Generated (High paste ratio or massive paste velocity with low keystrokes)
    is_pasted_ai = 1 if (paste_ratio > 0.60 or (pasted_chars > 150 and keystroke_count < 30)) else 0

    return {
        "session_id": session_id,
        "student_id": student_id,
        "window_index": window_index,
        "window_start_iso": datetime.fromtimestamp(window_start_ms / 1000.0, tz=timezone.utc).isoformat(),
        "window_end_iso": datetime.fromtimestamp(window_end_ms / 1000.0, tz=timezone.utc).isoformat(),
        "total_events": total_events,
        "active_time_sec": round(active_time_sec, 2),
        "keystroke_count": keystroke_count,
        "manual_chars_inserted": manual_chars_inserted,
        "chars_deleted": chars_deleted,
        "paste_count": paste_count,
        "pasted_chars": pasted_chars,
        "paste_velocity": paste_velocity,
        "typing_speed_cpm": typing_speed_cpm,
        "paste_ratio": paste_ratio,
        "label": is_pasted_ai
    }


def extract_sliding_windows(events: List[Dict[str, Any]], window_min: int, slide_min: int) -> List[Dict[str, Any]]:
    """Segment events by session and create 5-minute sliding windows."""
    # Group events by session_id
    sessions: Dict[str, List[Dict[str, Any]]] = {}
    for evt in events:
        sid = evt.get("session_id", "default_session")
        sessions.setdefault(sid, []).append(evt)
        
    extracted_rows = []
    window_ms = window_min * 60 * 1000
    slide_ms = slide_min * 60 * 1000

    for sid, sess_events in sessions.items():
        sess_events.sort(key=lambda x: x.get("timestamp", 0))
        if not sess_events:
            continue
            
        student_id = sess_events[0].get("student_id", "unknown_student")
        first_ts = sess_events[0].get("timestamp", 0)
        last_ts = sess_events[-1].get("timestamp", first_ts)
        
        # Slide window from start to end
        current_start = first_ts
        window_idx = 0
        
        while current_start <= last_ts or window_idx == 0:
            current_end = current_start + window_ms
            window_events = [
                e for e in sess_events
                if current_start <= e.get("timestamp", 0) < current_end
            ]
            
            if window_events:
                row = calculate_window_features(
                    window_events, sid, student_id, current_start, current_end, window_idx
                )
                extracted_rows.append(row)
                
            window_idx += 1
            current_start += slide_ms
            if current_start > last_ts:
                break

    return extracted_rows


def export_to_csv(rows: List[Dict[str, Any]], output_path: str):
    if not rows:
        print("[!] No feature rows generated. Dataset is empty.", file=sys.stderr)
        return
        
    fieldnames = list(rows[0].keys())
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
        
    print(f"[OK] Successfully exported {len(rows)} window instances to '{output_path}'.")


def main():
    args = parse_args()
    events: List[Dict[str, Any]] = []

    # Auto-detect or select source
    if args.source == "sqlite" or (args.source == "auto" and args.sqlite_path):
        db_path = args.sqlite_path or find_sqlite_db()
        if db_path and os.path.exists(db_path):
            events = fetch_from_sqlite(db_path)
        else:
            print(f"[!] SQLite DB not found. Provide --sqlite-path.", file=sys.stderr)

    if not events and (args.source in ["mongo", "auto"]):
        mongo_uri = args.mongo_uri or os.environ.get("MONGODB_URI")
        if mongo_uri:
            try:
                events = fetch_from_mongo(mongo_uri)
            except Exception as e:
                print(f"[-] MongoDB connection skipped/failed: {e}")

    if not events and (args.source in ["mock", "auto"]):
        mock_path = args.mock_path
        if os.path.exists(mock_path):
            events = fetch_from_mock(mock_path)

    if not events:
        print("[!] No events found across all data sources. Creating sample baseline records for demonstration...")
        # Create a synthetic baseline demonstration sample
        now_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
        events = [
            # Genuine Coding Session sample
            {"session_id": "sess_genuine_01", "student_id": "student_01", "event_type": "KEYSTROKE", "timestamp": now_ms - 240000, "payload_json": '{"charCount": 1, "netInsertedChars": 1}'},
            {"session_id": "sess_genuine_01", "student_id": "student_01", "event_type": "KEYSTROKE", "timestamp": now_ms - 200000, "payload_json": '{"charCount": 1, "netInsertedChars": 1}'},
            {"session_id": "sess_genuine_01", "student_id": "student_01", "event_type": "KEYSTROKE", "timestamp": now_ms - 150000, "payload_json": '{"charCount": 1, "netInsertedChars": 1}'},
            # AI/Pasted Session sample
            {"session_id": "sess_pasted_02", "student_id": "student_02", "event_type": "PASTE_BURST", "timestamp": now_ms - 100000, "payload_json": '{"charCount": 350, "netInsertedChars": 350}'},
            {"session_id": "sess_pasted_02", "student_id": "student_02", "event_type": "PASTE_BURST", "timestamp": now_ms - 40000, "payload_json": '{"charCount": 420, "netInsertedChars": 420}'},
        ]

    print(f"[*] Processing {len(events)} total telemetry events into 5-minute sliding windows...")
    rows = extract_sliding_windows(events, args.window_minutes, args.slide_minutes)
    export_to_csv(rows, args.output)

    # Print summary statistics
    class_0_count = sum(1 for r in rows if r.get("label") == 0)
    class_1_count = sum(1 for r in rows if r.get("label") == 1)
    print("\n--- Summary ---")
    print(f"Total 5-min Windows Extracted: {len(rows)}")
    print(f"Class 0 (Genuine Coding):      {class_0_count}")
    print(f"Class 1 (AI / Pasted Bursts):  {class_1_count}")


if __name__ == "__main__":
    main()
