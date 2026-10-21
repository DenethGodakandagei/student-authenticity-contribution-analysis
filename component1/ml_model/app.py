import os
import sys
import pandas as pd
import streamlit as st

# Setup paths
APP_DIR = os.path.dirname(os.path.abspath(__file__))
SRC_DIR = os.path.join(APP_DIR, "src")
DATA_DIR = os.path.join(APP_DIR, "data")

for p in [SRC_DIR, APP_DIR]:
    if p not in sys.path:
        sys.path.insert(0, p)

try:
    from src.config import (
        FEATURE_COLUMNS,
        LOW_RISK_MAX,
        HIGH_RISK_MIN,
        MODEL_SAVE_PATH
    )
    from src.predict import (
        load_model_bundle,
        predict_authenticity,
        classify_risk_tier
    )
except ImportError:
    from config import (
        FEATURE_COLUMNS,
        LOW_RISK_MAX,
        HIGH_RISK_MIN,
        MODEL_SAVE_PATH
    )
    from predict import (
        load_model_bundle,
        predict_authenticity,
        classify_risk_tier
    )

st.set_page_config(
    page_title="Student Telemetry Authenticity Classifier (XGBoost)",
    layout="wide"
)

# Load Model
@st.cache_resource
def load_model():
    path = MODEL_SAVE_PATH
    if not os.path.exists(path):
        alt = os.path.join(APP_DIR, "model_artifacts", "authenticity_classifier.joblib")
        if os.path.exists(alt):
            path = alt
    return load_model_bundle(path)

try:
    model_bundle = load_model()
    model_loaded = True
except Exception as e:
    model_bundle = None
    model_loaded = False
    st.error(f"Error loading model: {e}")

# Title
st.title("Student Telemetry Authenticity Classifier (XGBoost)")
st.write("Click any pre-configured student behavioral scenario below for instant 1-click evaluation, or adjust the input fields manually.")

# Pre-configured Student Archetypes (5 Scenarios)
SCENARIOS = {
    "Human: Deep Work Problem Solver": {
        "description": "Natural typing cadence, healthy iterative code churn (backspaces/deletions), 0 paste volume.",
        "duration_minutes": 25.0,
        "keystrokes": 1150,
        "lines_added": 42,
        "lines_removed": 18,
        "net_lines": 24,
        "code_churn_ratio": 0.30,
        "paste_count": 0,
        "characters_pasted": 0,
        "typing_speed_cpm": 46.0,
        "keystroke_efficiency_keff": 27.38,
        "paste_ratio": 0.0,
        "is_offline": 0,
        "files_edited_count": 2
    },
    "Human: Fast Fluent Developer": {
        "description": "High typing speed (~80 CPM), minimal paste (~2%), frequent refactoring and edits.",
        "duration_minutes": 12.0,
        "keystrokes": 980,
        "lines_added": 65,
        "lines_removed": 14,
        "net_lines": 51,
        "code_churn_ratio": 0.1772,
        "paste_count": 1,
        "characters_pasted": 25,
        "typing_speed_cpm": 81.67,
        "keystroke_efficiency_keff": 15.08,
        "paste_ratio": 0.0249,
        "is_offline": 0,
        "files_edited_count": 3
    },
    "AI: ChatGPT 1-Shot Paste Dump": {
        "description": "12 keystrokes, 1,500 pasted characters, paste ratio 99%, 0 refactoring churn.",
        "duration_minutes": 1.5,
        "keystrokes": 12,
        "lines_added": 95,
        "lines_removed": 0,
        "net_lines": 95,
        "code_churn_ratio": 0.0,
        "paste_count": 1,
        "characters_pasted": 1520,
        "typing_speed_cpm": 8.0,
        "keystroke_efficiency_keff": 0.13,
        "paste_ratio": 0.9922,
        "is_offline": 0,
        "files_edited_count": 1
    },
    "AI: Multi-Prompt StackOverflow / AI Stitching": {
        "description": "Multiple large paste bursts (5 pastes, 2,450 chars), low keystrokes relative to code volume.",
        "duration_minutes": 6.0,
        "keystrokes": 65,
        "lines_added": 140,
        "lines_removed": 4,
        "net_lines": 136,
        "code_churn_ratio": 0.0278,
        "paste_count": 5,
        "characters_pasted": 2450,
        "typing_speed_cpm": 10.83,
        "keystroke_efficiency_keff": 0.46,
        "paste_ratio": 0.9742,
        "is_offline": 0,
        "files_edited_count": 2
    },
    "Hybrid: Copilot Inline Autocomplete": {
        "description": "Moderate typing speed, small 2-3 line auto-completions, paste ratio ~38%.",
        "duration_minutes": 14.0,
        "keystrokes": 620,
        "lines_added": 55,
        "lines_removed": 10,
        "net_lines": 45,
        "code_churn_ratio": 0.1538,
        "paste_count": 8,
        "characters_pasted": 380,
        "typing_speed_cpm": 44.29,
        "keystroke_efficiency_keff": 11.27,
        "paste_ratio": 0.38,
        "is_offline": 0,
        "files_edited_count": 2
    }
}

# Scenario Buttons Header
st.subheader("1-Click Student Behavioral Scenarios")

# 5 Columns for Scenario Buttons
scenario_cols = st.columns(5)
selected_scenario_key = None

for idx, (name, sc_data) in enumerate(SCENARIOS.items()):
    with scenario_cols[idx]:
        if st.button(name, key=f"btn_sc_{idx}"):
            st.session_state["active_scenario"] = name
            st.session_state["val_dur"] = float(sc_data["duration_minutes"])
            st.session_state["val_keys"] = int(sc_data["keystrokes"])
            st.session_state["val_add"] = int(sc_data["lines_added"])
            st.session_state["val_rem"] = int(sc_data["lines_removed"])
            st.session_state["val_paste_cnt"] = int(sc_data["paste_count"])
            st.session_state["val_paste_chars"] = int(sc_data["characters_pasted"])
            st.session_state["val_files"] = int(sc_data["files_edited_count"])
            st.session_state["val_offline"] = int(sc_data["is_offline"])

# Default initial values if not set
active_name = st.session_state.get("active_scenario", "Human: Deep Work Problem Solver")
active_info = SCENARIOS.get(active_name, SCENARIOS["Human: Deep Work Problem Solver"])

st.info(f"Active Scenario: **{active_name}** — {active_info['description']}")

st.markdown("---")

# Telemetry Input Fields
st.subheader("Telemetry Parameters")

c1, c2, c3 = st.columns(3)

with c1:
    duration_val = st.number_input(
        "Duration (Minutes)",
        min_value=0.5,
        max_value=240.0,
        value=float(st.session_state.get("val_dur", active_info["duration_minutes"])),
        step=0.5
    )
    keystrokes_val = st.number_input(
        "Keystrokes Count",
        min_value=0,
        max_value=50000,
        value=int(st.session_state.get("val_keys", active_info["keystrokes"])),
        step=10
    )

with c2:
    added_val = st.number_input(
        "Lines Added",
        min_value=1,
        max_value=5000,
        value=int(st.session_state.get("val_add", active_info["lines_added"])),
        step=1
    )
    removed_val = st.number_input(
        "Lines Removed",
        min_value=0,
        max_value=2000,
        value=int(st.session_state.get("val_rem", active_info["lines_removed"])),
        step=1
    )

with c3:
    paste_cnt_val = st.number_input(
        "Paste Bursts Count",
        min_value=0,
        max_value=100,
        value=int(st.session_state.get("val_paste_cnt", active_info["paste_count"])),
        step=1
    )
    paste_chars_val = st.number_input(
        "Characters Pasted",
        min_value=0,
        max_value=50000,
        value=int(st.session_state.get("val_paste_chars", active_info["characters_pasted"])),
        step=10
    )

# Compute Features Vector
total_activity_chars = max(1, keystrokes_val + paste_chars_val)
comp_paste_ratio = round(paste_chars_val / total_activity_chars, 4)
total_lines_churn = added_val + removed_val
comp_code_churn = round(removed_val / total_lines_churn, 4) if total_lines_churn > 0 else 0.0
comp_cpm = round(keystrokes_val / duration_val, 2)
comp_keff = round(keystrokes_val / added_val, 2) if added_val > 0 else 0.0
comp_net = added_val - removed_val
files_val = int(st.session_state.get("val_files", active_info.get("files_edited_count", 1)))
offline_val = int(st.session_state.get("val_offline", active_info.get("is_offline", 0)))

eval_vector = {
    "duration_minutes": float(duration_val),
    "keystrokes": int(keystrokes_val),
    "lines_added": int(added_val),
    "lines_removed": int(removed_val),
    "net_lines": int(comp_net),
    "code_churn_ratio": float(comp_code_churn),
    "paste_count": int(paste_cnt_val),
    "characters_pasted": int(paste_chars_val),
    "typing_speed_cpm": float(comp_cpm),
    "keystroke_efficiency_keff": float(comp_keff),
    "paste_ratio": float(comp_paste_ratio),
    "is_offline": int(offline_val),
    "files_edited_count": int(files_val)
}

# Evaluate automatically when scenario is chosen, or when button clicked
st.write("")
predict_button = st.button("Predict Authenticity", type="primary")

# Execute Prediction
if model_loaded:
    pred_res = predict_authenticity(eval_vector, model_bundle=model_bundle)
    suspicion_score = pred_res["suspicion_score_percent"]
    authenticity_score = pred_res["authenticity_score_percent"]
    risk_classification = pred_res["risk_tier"]

    st.markdown("---")
    st.subheader("Model Prediction")

    # Score Metrics
    m1, m2, m3 = st.columns(3)
    with m1:
        st.metric("Authenticity Score", f"{authenticity_score:.1f}%")
    with m2:
        st.metric("Suspicion Score (AI)", f"{suspicion_score:.1f}%")
    with m3:
        st.metric("Risk Tier", risk_classification)

    # Classification Alert
    if suspicion_score < LOW_RISK_MAX:
        st.success(f"Verdict: {risk_classification} — Telemetry reflects authentic human development patterns.")
    elif suspicion_score <= HIGH_RISK_MIN:
        st.warning(f"Verdict: {risk_classification} — Mixed indicators detected. Requires secondary review.")
    else:
        st.error(f"Verdict: {risk_classification} — High confidence of AI generation or bulk copy-paste.")

    # Computed Evaluated Features
    st.write("**Computed Behavioral Ratios:**")
    f1, f2, f3, f4 = st.columns(4)
    f1.write(f"Typing Speed: **{comp_cpm:.1f} CPM**")
    f2.write(f"Paste Ratio: **{comp_paste_ratio:.1%}**")
    f3.write(f"Code Churn Ratio: **{comp_code_churn:.2f}**")
    f4.write(f"Keystroke Efficiency: **{comp_keff:.1f} keys/line**")
