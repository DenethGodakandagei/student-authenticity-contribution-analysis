"""
Terminal Authenticity Dashboard (terminal_dashboard.py)
-------------------------------------------------------
A rich CLI terminal dashboard displaying real-time ML model diagnostics,
GroupKFold benchmark metrics, cohort risk distribution, and individual
student window suspicion scores using the trained XGBoost model.

Usage:
    python terminal_dashboard.py
    python terminal_dashboard.py --data preprocessed_features.csv
"""

import os
import sys
import json
import argparse
import numpy as np
import pandas as pd
import joblib

try:
    from .config import (
        MODEL_SAVE_PATH,
        METADATA_SAVE_PATH,
        FEATURE_COLUMNS,
        LOW_RISK_MAX,
        HIGH_RISK_MIN,
        DEFAULT_DATA_PATH
    )
    from .predict import predict_authenticity, classify_risk_tier
except ImportError:
    from config import (
        MODEL_SAVE_PATH,
        METADATA_SAVE_PATH,
        FEATURE_COLUMNS,
        LOW_RISK_MAX,
        HIGH_RISK_MIN,
        DEFAULT_DATA_PATH
    )
    from predict import predict_authenticity, classify_risk_tier

# Ensure utf-8 stdout on Windows console
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# ANSI Color Codes for Terminal Output (works in modern Windows Terminal & PowerShell)
RESET = "\033[0m"
BOLD = "\033[1m"
DIM = "\033[2m"
GREEN = "\033[32m"
YELLOW = "\033[33m"
RED = "\033[31m"
CYAN = "\033[36m"
WHITE = "\033[37m"



def load_artifacts():
    if not os.path.exists(MODEL_SAVE_PATH):
        raise FileNotFoundError(f"Model bundle not found at '{MODEL_SAVE_PATH}'. Run 'python train.py' first.")
    bundle = joblib.load(MODEL_SAVE_PATH)
    
    meta = {}
    if os.path.exists(METADATA_SAVE_PATH):
        with open(METADATA_SAVE_PATH, "r", encoding="utf-8") as f:
            meta = json.load(f)
    return bundle, meta


def render_dashboard(data_path: str = None):
    bundle, meta = load_artifacts()
    model = bundle.get("model")
    model_name = bundle.get("model_name", "Unknown Model")

    csv_target = data_path or ("preprocessed_features.csv" if os.path.exists("preprocessed_features.csv") else DEFAULT_DATA_PATH)
    if not os.path.exists(csv_target):
        print(f"{RED}[Error] Dataset file not found: {csv_target}{RESET}")
        return

    df = pd.read_csv(csv_target)

    # 1. Run predictions across all rows
    predictions = []
    for idx, row in df.iterrows():
        feat_dict = {col: row.get(col, 0) for col in FEATURE_COLUMNS}
        pred = predict_authenticity(feat_dict, model_bundle=bundle)
        pid = row.get("student_id", row.get("participant_id", f"Student_{idx:02d}"))
        predictions.append({
            "student_id": pid,
            "window": row.get("window_index", idx),
            "ground_truth": row.get("authenticity_label", 0),
            "suspicion": pred["suspicion_score_percent"],
            "tier": pred["risk_tier"],
            "typing_speed": row.get("typing_speed_cpm", 0),
            "paste_ratio": row.get("paste_ratio", 0),
            "code_churn": row.get("code_churn_ratio", 0)
        })

    pred_df = pd.DataFrame(predictions)
    total_samples = len(pred_df)
    low_risk_count = sum(pred_df["suspicion"] < LOW_RISK_MAX)
    inconclusive_count = sum((pred_df["suspicion"] >= LOW_RISK_MAX) & (pred_df["suspicion"] <= HIGH_RISK_MIN))
    high_risk_count = sum(pred_df["suspicion"] > HIGH_RISK_MIN)

    # --- TOP HEADER ---
    print("\n" + f"{CYAN}{'='*80}{RESET}")
    print(f"{BOLD}{WHITE}  OFFSYNC / COLLABINTEL — ML AUTHENTICITY TERMINAL DASHBOARD{RESET}")
    print(f"{CYAN}{'='*80}{RESET}")
    print(f"  Active Model:     {BOLD}{GREEN}{model_name}{RESET}")
    print(f"  Model Artifact:   {DIM}{MODEL_SAVE_PATH}{RESET}")
    print(f"  Telemetry Feed:   {WHITE}{csv_target}{RESET} ({total_samples} sliding windows)")
    print(f"  Risk Thresholds:  {GREEN}Low: <{LOW_RISK_MAX}%{RESET} | {YELLOW}Inconclusive: {LOW_RISK_MAX}%-{HIGH_RISK_MIN}%{RESET} | {RED}High: >{HIGH_RISK_MIN}%{RESET}")

    # --- KPI CARDS ---
    print("\n" + f"{BOLD}  [1] COHORT RISK SUMMARY METRICS{RESET}")
    print("  " + "-" * 76)
    low_pct = (low_risk_count / total_samples) * 100 if total_samples else 0
    inconc_pct = (inconclusive_count / total_samples) * 100 if total_samples else 0
    high_pct = (high_risk_count / total_samples) * 100 if total_samples else 0

    print(f"  | {BOLD}Total Windows{RESET}: {total_samples:<5} "
          f"| {GREEN}Verified Authentic{RESET}: {low_risk_count} ({low_pct:.1f}%) "
          f"| {YELLOW}Inconclusive{RESET}: {inconclusive_count} ({inconc_pct:.1f}%) "
          f"| {RED}High Risk Anomaly{RESET}: {high_risk_count} ({high_pct:.1f}%) |")
    print("  " + "-" * 76)

    # --- FEATURE IMPORTANCE (if available) ---
    raw_clf = model.named_steps["clf"] if hasattr(model, "named_steps") else model
    if hasattr(raw_clf, "feature_importances_"):
        print(f"\n{BOLD}  [2] TOP BIOMETRIC DISCRIMINATORS (XGBoost Feature Weights){RESET}")
        print("  " + "-" * 76)
        importances = raw_clf.feature_importances_
        indices = np.argsort(importances)[::-1]
        for rank, idx in enumerate(indices[:5], 1):
            feat = FEATURE_COLUMNS[idx]
            wt = importances[idx] * 100
            bar_len = int(wt / 3)
            bar = f"{CYAN}{'#' * bar_len}{'-' * max(0, 25 - bar_len)}{RESET}"
            print(f"    {rank}. {feat:<26} {wt:6.2f}%  [{bar}]")

    # --- STUDENT-LEVEL AGGREGATE BREAKDOWN ---
    print(f"\n{BOLD}  [3] PARTICIPANT AUTHENTICITY BREAKDOWN{RESET}")
    print("  " + "-" * 76)
    print(f"  {'Participant ID':<16} {'Windows':<10} {'Mean Suspicion':<18} {'Primary Verdict':<24}")
    print("  " + "-" * 76)

    student_groups = pred_df.groupby("student_id")
    for pid, group in student_groups:
        mean_susp = group["suspicion"].mean()
        high_cnt = sum(group["suspicion"] > HIGH_RISK_MIN)
        
        if mean_susp < LOW_RISK_MAX:
            badge = f"{GREEN}[AUTHENTIC] Genuine Human{RESET}"
        elif mean_susp > HIGH_RISK_MIN:
            badge = f"{RED}[ALERT] High AI ({high_cnt} windows){RESET}"
        else:
            badge = f"{YELLOW}[REVIEW] Mixed / Inconclusive{RESET}"

        pid_display = (str(pid)[:14] + "..") if len(str(pid)) > 15 else str(pid)
        print(f"  {pid_display:<16} {len(group):<10} {mean_susp:6.2f}%            {badge}")

    # --- SAMPLE RECENT WINDOWS AUDIT ---
    print(f"\n{BOLD}  [4] DETAILED WINDOW SAMPLING (Inspect Live Telemetry){RESET}")
    print("  " + "-" * 76)
    print(f"  {'Participant':<14} {'Win#':<6} {'Typing CPM':<12} {'Paste%':<10} {'Suspicion':<14} {'Status':<20}")
    print("  " + "-" * 76)

    sample_step = max(1, len(pred_df) // 10)
    for i in range(0, len(pred_df), sample_step):
        row = pred_df.iloc[i]
        pid_disp = (str(row['student_id'])[:12] + "..") if len(str(row['student_id'])) > 13 else str(row['student_id'])
        susp = row['suspicion']
        
        if susp < LOW_RISK_MAX:
            status = f"{GREEN}Low Risk{RESET}"
        elif susp > HIGH_RISK_MIN:
            status = f"{RED}High Risk (AI){RESET}"
        else:
            status = f"{YELLOW}Review{RESET}"

        print(f"  {pid_disp:<14} #{row['window']:<5} {row['typing_speed']:<12.1f} {row['paste_ratio']*100:<9.1f}% {susp:6.2f}%        {status}")

    print("  " + "-" * 76)
    print(f"{CYAN}{'='*80}{RESET}\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Terminal Authenticity Dashboard")
    parser.add_argument("--data", type=str, default=None, help="Path to telemetry/feature CSV")
    args = parser.parse_args()
    render_dashboard(args.data)
