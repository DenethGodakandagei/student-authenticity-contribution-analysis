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
    from src.db import fetch_live_sessions_from_db
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
    from db import fetch_live_sessions_from_db

st.set_page_config(
    page_title="Student Telemetry Authenticity Classifier (XGBoost)",
    layout="wide"
)

# Load Model Bundle
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

# Cache live database query (TTL 15 seconds for real-time updates)
@st.cache_data(ttl=15)
def get_live_db_data():
    return fetch_live_sessions_from_db(exclude_mock=False)

# Title Header
st.title("Student Telemetry Authenticity Classifier (XGBoost)")
st.write("Live evaluation engine connected directly to MongoDB Atlas. View real-time database student telemetry sessions or test behavioral scenarios.")

# Tabs: Real Database vs. Scenario Testing
tab_db, tab_scenarios = st.tabs([
    "Live Database Sessions (Real-Time MongoDB Atlas)",
    "Scenario Testing & Manual Predictor"
])

# ==============================================================================
# TAB 1: LIVE DATABASE SESSIONS (REAL-TIME MONGODB ATLAS)
# ==============================================================================
with tab_db:
    st.subheader("Live Student Telemetry from MongoDB Atlas")

    # Controls Row
    col_status, col_btn = st.columns([4, 1])

    with col_btn:
        if st.button("Refresh Real-Time Data", type="primary", use_container_width=True):
            st.cache_data.clear()
            st.rerun()

    # Fetch Real-Time Data
    with st.spinner("Connecting to MongoDB Atlas..."):
        df_live, is_live, db_msg = get_live_db_data()

    with col_status:
        if is_live:
            st.success(f"{db_msg}")
        else:
            st.warning(f"{db_msg}")

    if not df_live.empty:
        # KPI Summary Metrics
        total_sessions = len(df_live)
        low_risk_count = len(df_live[df_live["_auth_pct"] >= 70.0])
        med_risk_count = len(df_live[(df_live["_susp_pct"] >= 30.0) & (df_live["_susp_pct"] <= 70.0)])
        high_risk_count = len(df_live[df_live["_susp_pct"] > 70.0])

        k1, k2, k3, k4 = st.columns(4)
        k1.metric("Total Live Sessions", f"{total_sessions}")
        k2.metric("Authentic (Low Risk)", f"{low_risk_count}", f"{round(low_risk_count/total_sessions*100, 1)}%")
        k3.metric("Review (Medium Risk)", f"{med_risk_count}", f"{round(med_risk_count/total_sessions*100, 1)}%")
        k4.metric("Anomalies (High Risk)", f"{high_risk_count}", f"{round(high_risk_count/total_sessions*100, 1)}%")

        st.markdown("---")

        # Table Filters
        f1, f2, f3, f4 = st.columns([2, 2, 2, 1])
        all_students = ["All Students"] + sorted(list(df_live["Student Name"].dropna().unique()))
        with f1:
            selected_student = st.selectbox("Filter by Student", all_students)

        all_tiers = ["All Risk Tiers", "Low Risk", "Medium Risk", "High Risk"]
        with f2:
            selected_tier = st.selectbox("Filter by Risk Tier", all_tiers)

        all_assignments = ["All Assignments"] + sorted(list(df_live["Assignment"].dropna().unique()))
        with f3:
            selected_assign = st.selectbox("Filter by Assignment", all_assignments)

        with f4:
            show_time_col = st.checkbox("Show Time", value=True, help="Toggle Session Start (Local Time) column in table")

        # Apply Filters
        filtered_df = df_live.copy()
        if selected_student != "All Students":
            filtered_df = filtered_df[filtered_df["Student Name"] == selected_student]
        if selected_tier != "All Risk Tiers":
            filtered_df = filtered_df[filtered_df["Risk Tier"].str.contains(selected_tier, case=False, na=False)]
        if selected_assign != "All Assignments":
            filtered_df = filtered_df[filtered_df["Assignment"] == selected_assign]

        # Display Data Table with Accurate Local Time
        time_col_name = "Session Start (Local Time)" if "Session Start (Local Time)" in filtered_df.columns else "Session Start"
        display_cols = ["Student Name", "Assignment"]
        if show_time_col:
            display_cols.append(time_col_name)
        display_cols.extend([
            "Duration (min)", "Keystrokes", "Net Lines", "Typing CPM", "Paste Ratio", "Churn Ratio",
            "Authenticity Score", "Suspicion Score", "Risk Tier", "Review Status"
        ])
        available_display_cols = [c for c in display_cols if c in filtered_df.columns]

        st.write(f"Showing **{len(filtered_df)}** of **{len(df_live)}** telemetry sessions from database:")
        st.dataframe(
            filtered_df[available_display_cols],
            use_container_width=True,
            hide_index=True
        )

        st.markdown("---")

        # Deep-Dive Session Inspector
        st.subheader("Deep-Dive Real Session Inspection")
        session_options = [
            f"{row['Student Name']} | {row['Assignment']} | {row.get(time_col_name, '')} (ID: {row['Session ID'][:8]}..)"
            for _, row in filtered_df.iterrows()
        ]

        if session_options:
            selected_session_str = st.selectbox("Select a Real Database Session to Inspect", session_options)
            sel_idx = session_options.index(selected_session_str)
            target_row = filtered_df.iloc[sel_idx]

            # 4 Metrics Row
            m1, m2, m3, m4 = st.columns(4)
            m1.metric("Authenticity Score", f"{target_row['Authenticity Score']}")
            m2.metric("Suspicion Score (AI)", f"{target_row['Suspicion Score']}")
            m3.metric("Risk Tier", target_row["Risk Tier"])
            m4.metric("Review Status", target_row["Review Status"])

            # Classification Box
            susp_val = float(target_row["_susp_pct"])
            tier_val = target_row["Risk Tier"]
            status_val = target_row["Review Status"]
            if susp_val < LOW_RISK_MAX:
                st.success(f"Verdict: {tier_val} — {status_val}. Reflects authentic human development cadence.")
            elif susp_val <= HIGH_RISK_MIN:
                st.warning(f"Verdict: {tier_val} — {status_val}. Mixed activity detected (active typing with elevated paste).")
            else:
                st.error(f"Verdict: {tier_val} — {status_val}. High confidence anomaly / wholesale code generation.")

            # Behavioral Ratios
            st.write("**Session Telemetry Features:**")
            b1, b2, b3, b4 = st.columns(4)
            b1.write(f"Typing Speed: **{target_row['Typing CPM']} CPM**")
            b2.write(f"Paste Ratio: **{float(target_row['Paste Ratio']):.1%}**")
            b3.write(f"Code Churn Ratio: **{target_row['Churn Ratio']}**")
            b4.write(f"Keystroke Efficiency: **{target_row['K-Eff (keys/line)']} keys/line**")

            # Load into Scenario testing tab button
            if st.button("Load this Real Session into Scenario Testing Tab", type="secondary"):
                feat = target_row["_feat_dict"]
                st.session_state["val_dur"] = float(feat["duration_minutes"])
                st.session_state["val_keys"] = int(feat["keystrokes"])
                st.session_state["val_add"] = int(feat["lines_added"])
                st.session_state["val_rem"] = int(feat["lines_removed"])
                st.session_state["val_paste_cnt"] = int(feat["paste_count"])
                st.session_state["val_paste_chars"] = int(feat["characters_pasted"])
                st.session_state["val_files"] = int(feat["files_edited_count"])
                st.session_state["val_offline"] = int(feat["is_offline"])
                st.session_state["active_scenario"] = f"DB: {target_row['Student Name']} ({target_row['Assignment']})"
                st.info("Loaded session into Scenario Testing Tab! Switch tabs above to test or edit parameters.")
    else:
        st.info("No session records found. Please ensure MongoDB Atlas has telemetry sessions.")


# ==============================================================================
# TAB 2: SCENARIO TESTING & CUSTOM PREDICTOR
# ==============================================================================
with tab_scenarios:
    st.subheader("1-Click Student Behavioral Scenarios")
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
            "description": "Multiple code paste bursts (65% paste ratio) stitched with modest manual keystrokes.",
            "duration_minutes": 8.0,
            "keystrokes": 250,
            "lines_added": 110,
            "lines_removed": 10,
            "net_lines": 100,
            "code_churn_ratio": 0.08,
            "paste_count": 4,
            "characters_pasted": 950,
            "typing_speed_cpm": 31.25,
            "keystroke_efficiency_keff": 2.27,
            "paste_ratio": 0.65,
            "is_offline": 0,
            "files_edited_count": 2
        },
        "Hybrid: Copilot Inline Autocomplete": {
            "description": "Active typing cadence with small 2-3 line auto-completions, paste ratio ~28%.",
            "duration_minutes": 14.0,
            "keystrokes": 620,
            "lines_added": 55,
            "lines_removed": 12,
            "net_lines": 43,
            "code_churn_ratio": 0.18,
            "paste_count": 8,
            "characters_pasted": 240,
            "typing_speed_cpm": 44.29,
            "keystroke_efficiency_keff": 11.27,
            "paste_ratio": 0.28,
            "is_offline": 0,
            "files_edited_count": 2
        }
    }

    # 5 Columns for Scenario Buttons
    scenario_cols = st.columns(5)
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

    # Active Scenario Display
    active_name = st.session_state.get("active_scenario", "Human: Deep Work Problem Solver")
    active_info = SCENARIOS.get(active_name, {
        "description": "Custom session parameters",
        "duration_minutes": 25.0, "keystrokes": 1150, "lines_added": 42,
        "lines_removed": 18, "paste_count": 0, "characters_pasted": 0
    })

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
            value=float(st.session_state.get("val_dur", active_info.get("duration_minutes", 25.0))),
            step=0.5
        )
        keystrokes_val = st.number_input(
            "Keystrokes Count",
            min_value=0,
            max_value=50000,
            value=int(st.session_state.get("val_keys", active_info.get("keystrokes", 1150))),
            step=10
        )

    with c2:
        added_val = st.number_input(
            "Lines Added",
            min_value=0,
            max_value=5000,
            value=max(0, int(st.session_state.get("val_add", active_info.get("lines_added", 42)))),
            step=1
        )
        removed_val = st.number_input(
            "Lines Removed",
            min_value=0,
            max_value=2000,
            value=int(st.session_state.get("val_rem", active_info.get("lines_removed", 18))),
            step=1
        )

    with c3:
        paste_cnt_val = st.number_input(
            "Paste Bursts Count",
            min_value=0,
            max_value=100,
            value=int(st.session_state.get("val_paste_cnt", active_info.get("paste_count", 0))),
            step=1
        )
        paste_chars_val = st.number_input(
            "Characters Pasted",
            min_value=0,
            max_value=50000,
            value=int(st.session_state.get("val_paste_chars", active_info.get("characters_pasted", 0))),
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
    files_val = int(st.session_state.get("val_files", active_info.get("files_edited_count", 2)))
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

    st.write("")
    predict_button = st.button("Predict Authenticity", type="primary")

    # Execute Prediction
    if model_loaded:
        pred_res = predict_authenticity(eval_vector, model_bundle=model_bundle)
        suspicion_score = pred_res["suspicion_score_percent"]
        authenticity_score = pred_res["authenticity_score_percent"]
        risk_classification = pred_res["risk_tier"]
        review_status = pred_res.get("status", "Verified")
        is_hybrid_case = pred_res.get("is_hybrid", False)

        st.markdown("---")
        st.subheader("Model Prediction")

        # Score Metrics
        m1, m2, m3, m4 = st.columns(4)
        with m1:
            st.metric("Authenticity Score", f"{authenticity_score:.1f}%")
        with m2:
            st.metric("Suspicion Score (AI)", f"{suspicion_score:.1f}%")
        with m3:
            st.metric("Risk Tier", risk_classification)
        with m4:
            st.metric("Review Status", review_status)

        # Classification Alert (Simple UI, Zero Emojis)
        if suspicion_score < LOW_RISK_MAX:
            st.success(f"Verdict: {risk_classification} — {review_status}. Telemetry reflects continuous human keystrokes and refactoring.")
        elif suspicion_score <= HIGH_RISK_MIN:
            st.warning(f"Verdict: {risk_classification} — {review_status}. Elevated paste volume alongside active keystrokes detected.")
        else:
            st.error(f"Verdict: {risk_classification} — {review_status}. High confidence of wholesale AI generation or bulk copy-paste.")

        if is_hybrid_case:
            st.info("Continuous Telemetry Calibration applied: Blends physical paste volume, refactoring churn, and active keystrokes to prevent binary saturation.")

        # Computed Evaluated Features
        st.write("**Computed Behavioral Ratios:**")
        f1, f2, f3, f4 = st.columns(4)
        f1.write(f"Typing Speed: **{comp_cpm:.1f} CPM**")
        f2.write(f"Paste Ratio: **{comp_paste_ratio:.1%}**")
        f3.write(f"Code Churn Ratio: **{comp_code_churn:.2f}**")
        f4.write(f"Keystroke Efficiency: **{comp_keff:.1f} keys/line**")
