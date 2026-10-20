"""
INCODE — Interactive Real-Data ML Prediction Tool (interactive_predict.py)
========================================================================
Feed REAL input telemetry data into the trained ML model and inspect the
exact continuous probability output and risk tier classification.

Usage:
    python interactive_predict.py
"""

import os
import sys
import json
import pandas as pd
import numpy as np

try:
    from config import (
        MODEL_SAVE_PATH,
        FEATURE_COLUMNS,
        LOW_RISK_MAX,
        HIGH_RISK_MIN,
        DEFAULT_DATA_PATH
    )
    from predict import predict_authenticity, classify_risk_tier, load_model_bundle
except ImportError:
    from .config import (
        MODEL_SAVE_PATH,
        FEATURE_COLUMNS,
        LOW_RISK_MAX,
        HIGH_RISK_MIN,
        DEFAULT_DATA_PATH
    )
    from .predict import predict_authenticity, classify_risk_tier, load_model_bundle

# Ensure UTF-8 output on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# ANSI Terminal Colors
RESET = "\033[0m"
BOLD = "\033[1m"
DIM = "\033[2m"
CYAN = "\033[36m"
GREEN = "\033[32m"
YELLOW = "\033[33m"
RED = "\033[31m"
WHITE = "\033[37m"
BG_GREEN = "\033[42m\033[30m"
BG_YELLOW = "\033[43m\033[30m"
BG_RED = "\033[41m\033[37m"


def print_banner():
    print(f"\n{CYAN}{BOLD}{'=' * 78}{RESET}")
    print(f"{CYAN}{BOLD}   INCODE — REAL-DATA ML AUTHENTICITY PREDICTION & PROBABILITY SPECTRUM{RESET}")
    print(f"{CYAN}{BOLD}{'=' * 78}{RESET}\n")


# Safe characters for Windows console
BLOCK_CHAR = "█"
EMPTY_CHAR = "░"
try:
    "█".encode(sys.stdout.encoding or "utf-8")
except Exception:
    BLOCK_CHAR = "#"
    EMPTY_CHAR = "-"


def print_ascii_meter(score_pct: float, tier: str):
    filled = int(round((score_pct / 100.0) * 40))
    empty = 40 - filled

    if score_pct < 30.0:
        bar = f"{GREEN}{BLOCK_CHAR * filled}{DIM}{EMPTY_CHAR * empty}{RESET}"
        badge = f"{BG_GREEN} LOW RISK {RESET} {GREEN}Authentic Human{RESET}"
    elif score_pct <= 70.0:
        bar = f"{YELLOW}{BLOCK_CHAR * filled}{DIM}{EMPTY_CHAR * empty}{RESET}"
        badge = f"{BG_YELLOW} INCONCLUSIVE {RESET} {YELLOW}Review Needed{RESET}"
    else:
        bar = f"{RED}{BLOCK_CHAR * filled}{DIM}{EMPTY_CHAR * empty}{RESET}"
        badge = f"{BG_RED} HIGH RISK {RESET} {RED}AI Anomaly / Pasted{RESET}"

    print(f"\n{WHITE}  [0% ────────────────────────── 50% ───────────────────────── 100%]{RESET}")
    print(f"  [{bar}] {score_pct:5.2f}%")
    print(f"  Tier Classification: {badge}\n")


def print_prediction_report(inputs: dict, result: dict, title: str = "Real Input Evaluation"):
    print(f"\n{CYAN}{BOLD}┌────────────────────────────────────────────────────────────────────────┐{RESET}")
    print(f"{CYAN}{BOLD}│  PREDICTION REPORT: {title:<50} │{RESET}")
    print(f"{CYAN}{BOLD}└────────────────────────────────────────────────────────────────────────┘{RESET}")
    
    print(f"\n{BOLD}  1. Real Telemetry Inputs Fed to Model:{RESET}")
    print("  " + "-" * 70)
    for col in FEATURE_COLUMNS:
        val = inputs.get(col, 0)
        formatted_val = f"{val:.4f}" if isinstance(val, float) else f"{val}"
        print(f"    • {col:<28}: {CYAN}{formatted_val:>12}{RESET}")

    print(f"\n{BOLD}  2. Continuous Machine Learning Outputs (predict_proba):{RESET}")
    print("  " + "-" * 70)
    p_ai = result["suspicion_score_percent"]
    p_human = result["authenticity_score_percent"]
    tier = result["risk_tier"]

    print(f"    • Suspicion Score P(AI)      : {BOLD}{p_ai:6.2f}%{RESET}")
    print(f"    • Authenticity Score P(Human): {BOLD}{p_human:6.2f}%{RESET}")
    print(f"    • Calibrated Risk Tier       : {BOLD}{tier}{RESET}")
    print(f"    • Verified Authentic (<30%)  : {GREEN if result['is_authentic'] else RED}{result['is_authentic']}{RESET}")
    print(f"    • High Risk Anomaly (>70%)   : {RED if result['is_anomaly'] else GREEN}{result['is_anomaly']}{RESET}")

    print_ascii_meter(p_ai, tier)

    print(f"{BOLD}  3. Exact JSON Response Received by INCODE System:{RESET}")
    print("  " + "-" * 70)
    print(f"  {DIM}{json.dumps(result, indent=4)}{RESET}\n")


def load_dataset():
    csv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "preprocessed_features.csv")
    if not os.path.exists(csv_path):
        csv_path = DEFAULT_DATA_PATH
    if not os.path.exists(csv_path):
        return None
    return pd.read_csv(csv_path)


def run_interactive():
    print_banner()
    bundle = load_model_bundle(MODEL_SAVE_PATH)
    print(f"{GREEN}[OK] Loaded Trained Model:{RESET} {bundle.get('model_name', 'XGBoost')}")
    print(f"{GREEN}[OK] Model Artifact Path :{RESET} {MODEL_SAVE_PATH}\n")

    df = load_dataset()
    has_dataset = (df is not None and len(df) > 0)

    while True:
        print(f"{BOLD}Select an action:{RESET}")
        print(f"  {CYAN}[1]{RESET} Enter CUSTOM real telemetry inputs manually")
        if has_dataset:
            print(f"  {CYAN}[2]{RESET} Pick a REAL student window from dataset (138 windows available)")
            print(f"  {CYAN}[3]{RESET} View Side-by-Side: Real Human Window vs. Real AI-Pasted Window")
        print(f"  {CYAN}[4]{RESET} Exit")
        
        choice = input(f"\n{BOLD}Enter choice (1-4): {RESET}").strip()

        if choice == "1":
            print(f"\n{BOLD}Enter Real Telemetry Values (press Enter to accept default):{RESET}")
            cpm = input("  Typing Speed CPM [default: 55.0]: ").strip()
            cpm = float(cpm) if cpm else 55.0

            paste_ratio = input("  Paste Ratio (0.0 to 1.0) [default: 0.0]: ").strip()
            paste_ratio = float(paste_ratio) if paste_ratio else 0.0

            keystrokes = input("  Keystrokes count [default: 250]: ").strip()
            keystrokes = int(keystrokes) if keystrokes else 250

            churn = input("  Code Churn Ratio (0.0 to 1.0) [default: 0.15]: ").strip()
            churn = float(churn) if churn else 0.15

            chars_pasted = input("  Characters Pasted [default: 0]: ").strip()
            chars_pasted = int(chars_pasted) if chars_pasted else 0

            lines_added = input("  Lines Added [default: 8]: ").strip()
            lines_added = int(lines_added) if lines_added else 8

            features = {
                "duration_minutes": 5.0,
                "keystrokes": keystrokes,
                "lines_added": lines_added,
                "lines_removed": 1,
                "net_lines": lines_added - 1,
                "code_churn_ratio": churn,
                "paste_count": 1 if chars_pasted > 0 else 0,
                "characters_pasted": chars_pasted,
                "typing_speed_cpm": cpm,
                "keystroke_efficiency_keff": round(keystrokes / max(1, lines_added), 2),
                "paste_ratio": paste_ratio,
                "is_offline": 0,
                "files_edited_count": 1
            }

            res = predict_authenticity(features, model_bundle=bundle)
            print_prediction_report(features, res, title=f"Custom Telemetry (CPM={cpm}, Paste={paste_ratio*100:.1f}%)")

        elif choice == "2" and has_dataset:
            print(f"\n{BOLD}Available Real Dataset Records ({len(df)} total rows):{RESET}")
            print(f"  {'Index':<6} {'Student ID (Hashed)':<28} {'CPM':<8} {'Paste%':<8} {'Keys':<6} {'Ground Truth':<12}")
            print("  " + "-" * 72)
            
            sample_indices = [0, 1, 5, 6, 7, 12, 13, 20, 50, 78, 100, 137]
            for idx in sample_indices:
                if idx < len(df):
                    row = df.iloc[idx]
                    pid = str(row.get("student_id", f"S_{idx}"))[:24] + ".."
                    cpm = float(row.get("typing_speed_cpm", 0))
                    paste = float(row.get("paste_ratio", 0)) * 100
                    keys = int(row.get("keystrokes", 0))
                    gt = "Human (0)" if row.get("authenticity_label", 0) == 0 else "AI Paste (1)"
                    print(f"  [{idx:<4}] {pid:<28} {cpm:<8.1f} {paste:<7.1f}% {keys:<6} {gt:<12}")

            idx_input = input(f"\n{BOLD}Enter row index (0-{len(df)-1}) to predict: {RESET}").strip()
            if idx_input.isdigit() and int(idx_input) < len(df):
                selected_idx = int(idx_input)
                row = df.iloc[selected_idx]
                feat_dict = {col: float(row.get(col, 0)) for col in FEATURE_COLUMNS}
                gt_label = "Verified Genuine Human" if row.get("authenticity_label", 0) == 0 else "AI Injection / Copied"
                res = predict_authenticity(feat_dict, model_bundle=bundle)
                print_prediction_report(feat_dict, res, title=f"Dataset Row #{selected_idx} (Ground Truth: {gt_label})")
            else:
                print(f"{RED}Invalid index.{RESET}")

        elif choice == "3" and has_dataset:
            # Human Row (Row 0)
            row_human = df.iloc[0]
            feat_human = {col: float(row_human.get(col, 0)) for col in FEATURE_COLUMNS}
            res_human = predict_authenticity(feat_human, model_bundle=bundle)
            print_prediction_report(feat_human, res_human, title="Real Dataset Row #0: Human Student Window")

            # AI Copied Row (Row 6)
            row_ai = df.iloc[6]
            feat_ai = {col: float(row_ai.get(col, 0)) for col in FEATURE_COLUMNS}
            res_ai = predict_authenticity(feat_ai, model_bundle=bundle)
            print_prediction_report(feat_ai, res_ai, title="Real Dataset Row #6: AI-Assisted Bulk Paste Window")

        elif choice == "4":
            print(f"\n{GREEN}Exiting. Have a great panel defense!{RESET}\n")
            break
        else:
            print(f"{RED}Invalid choice.{RESET}\n")


if __name__ == "__main__":
    run_interactive()
