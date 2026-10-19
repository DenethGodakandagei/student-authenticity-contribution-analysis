"""
Interactive Custom Authenticity Checker (check_custom.py)
---------------------------------------------------------
Allows testing the trained XGBoost authenticity model with your own custom
telemetry input (either interactively via console prompts, preset scenarios,
or via command-line arguments).

Usage:
    # 1. Interactive prompt:
    python check_custom.py

    # 2. Preset scenario testing:
    python check_custom.py --preset human
    python check_custom.py --preset ai_paste
    python check_custom.py --preset mixed

    # 3. Direct command-line input:
    python check_custom.py --cpm 75 --keystrokes 380 --pastes 0 --pasted-chars 0 --added 25 --removed 5
"""

import os
import sys
import argparse
import joblib

# Ensure utf-8 stdout on Windows console
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

try:
    from .config import (
        MODEL_SAVE_PATH,
        FEATURE_COLUMNS,
        LOW_RISK_MAX,
        HIGH_RISK_MIN
    )
    from .predict import predict_authenticity
except ImportError:
    from config import (
        MODEL_SAVE_PATH,
        FEATURE_COLUMNS,
        LOW_RISK_MAX,
        HIGH_RISK_MIN
    )
    from predict import predict_authenticity

# ANSI Color Codes
RESET = "\033[0m"
BOLD = "\033[1m"
GREEN = "\033[32m"
YELLOW = "\033[33m"
RED = "\033[31m"
CYAN = "\033[36m"
WHITE = "\033[37m"
DIM = "\033[2m"


def build_feature_vector(
    cpm: float,
    keystrokes: int,
    lines_added: int,
    lines_removed: int,
    paste_count: int,
    chars_pasted: int,
    files_edited: int = 1,
    duration_min: float = 5.0,
    is_offline: int = 0
) -> dict:
    """Computes all 13 sensor-agnostic features from raw telemetry."""
    total_chars = keystrokes + chars_pasted
    paste_ratio = float(chars_pasted / total_chars) if total_chars > 0 else 0.0

    total_churn_lines = lines_added + lines_removed
    code_churn_ratio = float(lines_removed / total_churn_lines) if total_churn_lines > 0 else 0.0

    net_lines = lines_added - lines_removed

    if keystrokes > 0:
        keff = max(0.0, min(1.0, (keystrokes - (lines_removed * 8)) / keystrokes))
    else:
        keff = 0.0

    return {
        "duration_minutes": float(duration_min),
        "keystrokes": float(keystrokes),
        "lines_added": float(lines_added),
        "lines_removed": float(lines_removed),
        "net_lines": float(net_lines),
        "code_churn_ratio": float(code_churn_ratio),
        "paste_count": float(paste_count),
        "characters_pasted": float(chars_pasted),
        "typing_speed_cpm": float(cpm),
        "keystroke_efficiency_keff": float(keff),
        "paste_ratio": float(paste_ratio),
        "is_offline": float(is_offline),
        "files_edited_count": float(files_edited)
    }


def evaluate_and_display(features: dict, title: str = "CUSTOM TELEMETRY EVALUATION"):
    if not os.path.exists(MODEL_SAVE_PATH):
        print(f"{RED}[Error] Model bundle not found at: {MODEL_SAVE_PATH}{RESET}")
        print("Please train the model first by running: python train.py --model xgb")
        return

    bundle = joblib.load(MODEL_SAVE_PATH)
    result = predict_authenticity(features, model_bundle=bundle)

    suspicion = result["suspicion_score_percent"]
    human_prob = result["probability_human"] * 100.0
    tier = result["risk_tier"]

    # Determine badge color
    if suspicion < LOW_RISK_MAX:
        status_color = GREEN
        status_badge = "[LOW RISK] Verified Authentic Human Coding"
        verdict_msg = "Natural biometric typing pattern detected. High confidence human authorship."
    elif suspicion > HIGH_RISK_MIN:
        status_color = RED
        status_badge = "[HIGH RISK] AI-Generated / Bulk Pasted Content"
        verdict_msg = "Anomalous paste-to-keystroke ratio or synthetic burst detected. Flagged for review."
    else:
        status_color = YELLOW
        status_badge = "[INCONCLUSIVE] Mixed / Moderate Risk"
        verdict_msg = "Mixed typing activity. Minor copy-pasting or syntax lookup detected."

    print("\n" + f"{CYAN}{'='*80}{RESET}")
    print(f"{BOLD}{WHITE}  OFFSYNC / COLLABINTEL — {title}{RESET}")
    print(f"{CYAN}{'='*80}{RESET}")

    print(f"\n{BOLD}  Input Telemetry Details (5-minute sliding window):{RESET}")
    print("  " + "-" * 76)
    print(f"  * Typing Speed (CPM):    {features['typing_speed_cpm']:<10.1f} | * Manual Keystrokes:   {int(features['keystrokes'])}")
    print(f"  * Lines Added:           {int(features['lines_added']):<10} | * Lines Removed:       {int(features['lines_removed'])}")
    print(f"  * Paste Count:           {int(features['paste_count']):<10} | * Characters Pasted:   {int(features['characters_pasted'])}")
    print(f"  * Paste Ratio:           {features['paste_ratio']*100:<9.1f}% | * Code Churn Ratio:    {features['code_churn_ratio']*100:.1f}%")
    print(f"  * Files Edited:          {int(features['files_edited_count']):<10} | * Keystroke Efficiency: {features['keystroke_efficiency_keff']*100:.1f}%")
    print("  " + "-" * 76)

    print(f"\n{BOLD}  XGBoost Classifier Verdict:{RESET}")
    print("  " + "-" * 76)
    print(f"  Active Model:            {BOLD}{bundle.get('model_name', 'XGBoost')}{RESET}")
    print(f"  Suspicion Score P(AI):   {status_color}{BOLD}{suspicion:.2f}%{RESET}")
    print(f"  Human Probability P(H):  {GREEN}{BOLD}{human_prob:.2f}%{RESET}")
    print(f"  Risk Tier:               {status_color}{BOLD}{status_badge}{RESET}")
    print(f"  Explanation:             {DIM}{verdict_msg}{RESET}")
    print("  " + "-" * 76)
    print(f"{CYAN}{'='*80}{RESET}\n")


def interactive_prompt():
    print("\n" + "=" * 80)
    print("  INTERACTIVE TELEMETRY INPUT PROMPT")
    print("  Enter custom metrics for a 5-minute coding window (press [Enter] for default)")
    print("=" * 80)

    def get_input(prompt_text, default_val, val_type=float):
        try:
            raw = input(f"  {prompt_text} [default: {default_val}]: ").strip()
            if not raw:
                return default_val
            return val_type(raw)
        except Exception:
            return default_val

    keystrokes = int(get_input("1. Manual Keystrokes", 280, int))
    cpm = float(get_input("2. Typing Speed in CPM (Chars/Min)", 56.0, float))
    lines_added = int(get_input("3. Lines Added", 20, int))
    lines_removed = int(get_input("4. Lines Removed", 3, int))
    paste_count = int(get_input("5. Number of Paste Events", 0, int))
    chars_pasted = int(get_input("6. Total Characters Pasted", 0, int))
    files_edited = int(get_input("7. Number of Files Edited", 1, int))

    feats = build_feature_vector(
        cpm=cpm,
        keystrokes=keystrokes,
        lines_added=lines_added,
        lines_removed=lines_removed,
        paste_count=paste_count,
        chars_pasted=chars_pasted,
        files_edited=files_edited
    )
    evaluate_and_display(feats, title="USER INPUT EVALUATION RESULT")


def main():
    parser = argparse.ArgumentParser(description="Evaluate custom telemetry with XGBoost")
    parser.add_argument("--preset", type=str, choices=["human", "ai_paste", "mixed"],
                        help="Quick test presets: 'human', 'ai_paste', or 'mixed'")
    parser.add_argument("--cpm", type=float, default=None, help="Typing speed (chars per minute)")
    parser.add_argument("--keystrokes", type=int, default=None, help="Manual keystrokes")
    parser.add_argument("--added", type=int, default=None, help="Lines added")
    parser.add_argument("--removed", type=int, default=None, help="Lines removed")
    parser.add_argument("--pastes", type=int, default=None, help="Paste event count")
    parser.add_argument("--pasted-chars", type=int, default=None, help="Characters pasted")
    parser.add_argument("--files", type=int, default=1, help="Files edited count")
    args = parser.parse_args()

    # Preset scenarios
    if args.preset == "human":
        print("\n[*] Loading Preset: Authentic Human Developer (natural typing, 0 pastes)...")
        feats = build_feature_vector(cpm=58.0, keystrokes=290, lines_added=24, lines_removed=4, paste_count=0, chars_pasted=0)
        evaluate_and_display(feats, title="PRESET: AUTHENTIC HUMAN DEVELOPER")
        return

    elif args.preset == "ai_paste":
        print("\n[*] Loading Preset: AI-Assisted Bulk Paste (0 keystrokes, 1 paste of 850 chars)...")
        feats = build_feature_vector(cpm=0.5, keystrokes=2, lines_added=65, lines_removed=0, paste_count=1, chars_pasted=850)
        evaluate_and_display(feats, title="PRESET: AI-GENERATED BULK PASTE")
        return

    elif args.preset == "mixed":
        print("\n[*] Loading Preset: Mixed Coding (moderate typing + small syntax snippet paste)...")
        feats = build_feature_vector(cpm=45.0, keystrokes=180, lines_added=30, lines_removed=10, paste_count=2, chars_pasted=120)
        evaluate_and_display(feats, title="PRESET: MIXED CODING")
        return

    # Direct CLI input
    if args.cpm is not None or args.keystrokes is not None:
        cpm = args.cpm if args.cpm is not None else 50.0
        keystrokes = args.keystrokes if args.keystrokes is not None else int(cpm * 5)
        added = args.added if args.added is not None else 15
        removed = args.removed if args.removed is not None else 2
        pastes = args.pastes if args.pastes is not None else 0
        pasted_chars = args.pasted_chars if args.pasted_chars is not None else 0

        feats = build_feature_vector(
            cpm=cpm,
            keystrokes=keystrokes,
            lines_added=added,
            lines_removed=removed,
            paste_count=pastes,
            chars_pasted=pasted_chars,
            files_edited=args.files
        )
        evaluate_and_display(feats, title="CUSTOM COMMAND-LINE EVALUATION")
        return

    # Default to interactive prompt
    interactive_prompt()


if __name__ == "__main__":
    main()
