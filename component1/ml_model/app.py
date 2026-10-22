import os
import sys
import pandas as pd
import streamlit as st
import altair as alt

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
    page_title="INCODE — Trust & Equity Analytics for Student Contributions",
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
st.title("INCODE — Trust & Equity Analytics for Student Contributions")
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

        # Initialize filter session states
        if "filter_student" not in st.session_state:
            st.session_state["filter_student"] = "All Students"
        if "filter_tier" not in st.session_state:
            st.session_state["filter_tier"] = "All Risk Tiers"
        if "filter_assign" not in st.session_state:
            st.session_state["filter_assign"] = "All Assignments"

        # Unique options from live data
        all_students = ["All Students"] + sorted(list(df_live["Student Name"].dropna().unique()))
        all_tiers = ["All Risk Tiers", "Low Risk", "Medium Risk", "High Risk"]
        all_assignments = ["All Assignments"] + sorted(list(df_live["Assignment"].dropna().unique()))

        # Determine indices safely
        student_top_idx = all_students.index(st.session_state["filter_student"]) if st.session_state["filter_student"] in all_students else 0
        tier_top_idx = all_tiers.index(st.session_state["filter_tier"]) if st.session_state["filter_tier"] in all_tiers else 0
        assign_top_idx = all_assignments.index(st.session_state["filter_assign"]) if st.session_state["filter_assign"] in all_assignments else 0

        # Table Filters (Top)
        f1, f2, f3, f4 = st.columns([2, 2, 2, 1])
        with f1:
            selected_student = st.selectbox("Filter by Student", all_students, index=student_top_idx, key="top_sel_student")
        with f2:
            selected_tier = st.selectbox("Filter by Risk Tier", all_tiers, index=tier_top_idx, key="top_sel_tier")
        with f3:
            selected_assign = st.selectbox("Filter by Assignment", all_assignments, index=assign_top_idx, key="top_sel_assign")
        with f4:
            show_time_col = st.checkbox("Show Time", value=True, help="Toggle Session Start (Local Time) column in table")

        # Synchronize if top filters changed
        if (selected_student != st.session_state["filter_student"] or 
            selected_tier != st.session_state["filter_tier"] or 
            selected_assign != st.session_state["filter_assign"]):
            st.session_state["filter_student"] = selected_student
            st.session_state["filter_tier"] = selected_tier
            st.session_state["filter_assign"] = selected_assign
            st.rerun()

        # Apply Filters using synchronized state
        filtered_df = df_live.copy()
        if st.session_state["filter_student"] != "All Students":
            filtered_df = filtered_df[filtered_df["Student Name"] == st.session_state["filter_student"]]
        if st.session_state["filter_tier"] != "All Risk Tiers":
            filtered_df = filtered_df[filtered_df["Risk Tier"].str.contains(st.session_state["filter_tier"], case=False, na=False)]
        if st.session_state["filter_assign"] != "All Assignments":
            filtered_df = filtered_df[filtered_df["Assignment"] == st.session_state["filter_assign"]]

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

        # ======================================================================
        # COMPREHENSIVE VISUAL TELEMETRY ANALYTICS (ALL DIAGRAMS)
        # ======================================================================
        st.subheader("Visual Telemetry Analytics Suite (All Diagrams)")
        st.caption("Complete diagnostic visual diagrams synthesized from live database telemetry records. Adjust the bottom filters below to slice, isolate, and evaluate cohort trends.")

        # Bottom Filters Bar
        b_col1, b_col2, b_col3, b_col4 = st.columns([3, 3, 3, 2])

        student_bot_idx = all_students.index(st.session_state["filter_student"]) if st.session_state["filter_student"] in all_students else 0
        tier_bot_idx = all_tiers.index(st.session_state["filter_tier"]) if st.session_state["filter_tier"] in all_tiers else 0
        assign_bot_idx = all_assignments.index(st.session_state["filter_assign"]) if st.session_state["filter_assign"] in all_assignments else 0

        with b_col1:
            bot_student = st.selectbox("Filter by Student (Bottom)", all_students, index=student_bot_idx, key="bot_sel_student")
        with b_col2:
            bot_tier = st.selectbox("Filter by Risk Tier (Bottom)", all_tiers, index=tier_bot_idx, key="bot_sel_tier")
        with b_col3:
            bot_assign = st.selectbox("Filter by Assignment (Bottom)", all_assignments, index=assign_bot_idx, key="bot_sel_assign")
        with b_col4:
            st.write("")
            st.write("")
            if st.button("Reset Filters", key="btn_reset_filters", use_container_width=True):
                st.session_state["filter_student"] = "All Students"
                st.session_state["filter_tier"] = "All Risk Tiers"
                st.session_state["filter_assign"] = "All Assignments"
                st.rerun()

        # Synchronize bottom filter selection if changed
        if (bot_student != st.session_state["filter_student"] or 
            bot_tier != st.session_state["filter_tier"] or 
            bot_assign != st.session_state["filter_assign"]):
            st.session_state["filter_student"] = bot_student
            st.session_state["filter_tier"] = bot_tier
            st.session_state["filter_assign"] = bot_assign
            st.rerun()

        if filtered_df.empty:
            st.info("No telemetry sessions match the selected filters. Use the filters above or click Reset Filters.")
        else:
            plot_df = filtered_df.copy()
            time_col = "Session Start (Local Time)" if "Session Start (Local Time)" in plot_df.columns else "Session Start"

            # Compute overall authenticity progress
            avg_auth = float(plot_df["_auth_pct"].mean()) if "_auth_pct" in plot_df.columns else 0.0
            total_keys = int(plot_df["Keystrokes"].sum()) if "Keystrokes" in plot_df.columns else 0
            total_dur = float(plot_df["Duration (min)"].sum()) if "Duration (min)" in plot_df.columns else 0.0

            # Overall progress bar & milestone KPI cards
            norm_progress = min(1.0, max(0.0, avg_auth / 100.0))
            st.progress(norm_progress, text=f"Overall Authenticity Progress: {avg_auth:.1f}% across {len(plot_df)} session(s)")

            p1, p2, p3, p4 = st.columns(4)
            p1.metric("Total Sessions", f"{len(plot_df)}")
            p2.metric("Mean Authenticity", f"{avg_auth:.1f}%")
            p3.metric("Total Keystrokes", f"{total_keys:,}")
            p4.metric("Logged Coding Time", f"{total_dur:.0f} mins")

            # Sequential session labels for clean visualization
            plot_df["Session"] = [
                f"S{i+1}: {row['Student Name']} ({str(row.get(time_col, ''))[-8:] if row.get(time_col) else f'#{i+1}'}) | {row.get('Duration (min)', 0):.0f}m"
                for i, (_, row) in enumerate(plot_df.iterrows())
            ]

            plot_df["Progress_Label"] = [
                f"{row['_auth_pct']:.1f}% | {row['Keystrokes']:,} keys | {row['Review Status']}"
                for _, row in plot_df.iterrows()
            ]

            # Common Risk Tier Color Mapping
            risk_domain = [
                "Low Risk (Authentic Human)",
                "Medium Risk (Inconclusive / Mixed Hybrid)",
                "High Risk (AI-Generated / Pasted)"
            ]
            risk_colors = ["#10b981", "#f59e0b", "#ef4444"]
            risk_color_scale = alt.Scale(domain=risk_domain, range=risk_colors)

            # View Mode: Tabbed vs All on One Page (Zero emojis)
            diag_tabs = st.tabs([
                "All Diagrams (Full View)",
                "Progress Tracker",
                "Behavioral Matrix (CPM vs Paste)",
                "Risk and Score Breakdown",
                "Cohort Comparison",
                "Custom Metric Explorer"
            ])

            # Helper functions to build charts cleanly
            def build_progress_chart():
                bars = (
                    alt.Chart(plot_df)
                    .mark_bar(cornerRadiusTopRight=8, cornerRadiusBottomRight=8, height=24)
                    .encode(
                        y=alt.Y("Session:N", title="Session Progression (Time Order)", sort=None),
                        x=alt.X("_auth_pct:Q", title="Authenticity Progress (%)", scale=alt.Scale(domain=[0, 115])),
                        color=alt.Color("Risk Tier:N", scale=risk_color_scale, title="Risk Classification"),
                        tooltip=[
                            alt.Tooltip("Student Name:N", title="Student"),
                            alt.Tooltip("Assignment:N", title="Assignment"),
                            alt.Tooltip(f"{time_col}:N", title="Session Start"),
                            alt.Tooltip("Authenticity Score:N", title="Authenticity"),
                            alt.Tooltip("Suspicion Score:N", title="Suspicion (AI)"),
                            alt.Tooltip("Risk Tier:N", title="Risk Tier"),
                            alt.Tooltip("Review Status:N", title="Review Status"),
                            alt.Tooltip("Typing CPM:Q", title="Typing CPM", format=".1f"),
                            alt.Tooltip("Paste Ratio:Q", title="Paste Ratio", format=".1%"),
                            alt.Tooltip("Keystrokes:Q", title="Keystrokes", format=","),
                            alt.Tooltip("Duration (min):Q", title="Duration (min)", format=".1f")
                        ]
                    )
                )
                text = (
                    alt.Chart(plot_df)
                    .mark_text(align="left", baseline="middle", dx=8, fontSize=11, fontWeight="bold")
                    .encode(
                        y=alt.Y("Session:N", sort=None),
                        x=alt.X("_auth_pct:Q"),
                        text=alt.Text("Progress_Label:N"),
                        color=alt.value("#0f172a")
                    )
                )
                return (bars + text).properties(height=max(200, len(plot_df) * 44))

            def build_behavioral_matrix():
                return (
                    alt.Chart(plot_df)
                    .mark_circle(size=140, opacity=0.85, stroke="#1e293b", strokeWidth=0.8)
                    .encode(
                        x=alt.X("Typing CPM:Q", title="Typing Speed (Characters Per Minute, CPM)", scale=alt.Scale(zero=False, padding=10)),
                        y=alt.Y("Paste Ratio:Q", title="Paste Ratio (Fraction of Content Pasted)", axis=alt.Axis(format="%"), scale=alt.Scale(domain=[0, 1.05])),
                        color=alt.Color("Risk Tier:N", scale=risk_color_scale, title="Risk Classification"),
                        size=alt.Size("Keystrokes:Q", title="Keystroke Volume", scale=alt.Scale(range=[90, 550])),
                        tooltip=[
                            alt.Tooltip("Student Name:N", title="Student"),
                            alt.Tooltip("Assignment:N", title="Assignment"),
                            alt.Tooltip("Authenticity Score:N", title="Authenticity"),
                            alt.Tooltip("Suspicion Score:N", title="Suspicion (AI)"),
                            alt.Tooltip("Risk Tier:N", title="Risk Tier"),
                            alt.Tooltip("Typing CPM:Q", title="Typing CPM", format=".1f"),
                            alt.Tooltip("Paste Ratio:Q", title="Paste Ratio", format=".1%"),
                            alt.Tooltip("Keystrokes:Q", title="Keystrokes", format=","),
                            alt.Tooltip("Duration (min):Q", title="Duration (min)", format=".1f"),
                            alt.Tooltip("Churn Ratio:Q", title="Churn Ratio", format=".2f"),
                        ]
                    )
                    .properties(height=360)
                    .interactive()
                )

            def build_risk_distribution():
                tier_bar = (
                    alt.Chart(plot_df)
                    .mark_bar(cornerRadiusTopLeft=6, cornerRadiusTopRight=6)
                    .encode(
                        x=alt.X("Risk Tier:N", sort=risk_domain, title="Risk Tier", axis=alt.Axis(labelAngle=-15)),
                        y=alt.Y("count():Q", title="Session Count"),
                        color=alt.Color("Risk Tier:N", scale=risk_color_scale, legend=None),
                        tooltip=[
                            alt.Tooltip("Risk Tier:N", title="Tier"),
                            alt.Tooltip("count():Q", title="Sessions")
                        ]
                    )
                    .properties(height=300)
                )
                score_hist = (
                    alt.Chart(plot_df)
                    .mark_bar(cornerRadiusTopLeft=4, cornerRadiusTopRight=4)
                    .encode(
                        x=alt.X("_auth_pct:Q", bin=alt.Bin(maxbins=15), title="Authenticity Score (%)", scale=alt.Scale(domain=[0, 100])),
                        y=alt.Y("count():Q", title="Session Frequency"),
                        color=alt.Color("_auth_pct:Q", scale=alt.Scale(domain=[0, 30, 70, 100], range=["#ef4444", "#f59e0b", "#3b82f6", "#10b981"]), title="Score Band"),
                        tooltip=[
                            alt.Tooltip("count():Q", title="Frequency"),
                            alt.Tooltip("_auth_pct:Q", bin=alt.Bin(maxbins=15), title="Score Range")
                        ]
                    )
                    .properties(height=300)
                )
                return tier_bar, score_hist

            def build_cohort_comparison(group_col="Student Name", metric_choice=("Mean Authenticity Score (%)", "_auth_pct", "mean")):
                m_label, m_col, m_agg = metric_choice
                if m_col == "Paste Ratio":
                    agg = plot_df.groupby(group_col)[m_col].mean().reset_index()
                    agg["MetricValue"] = (agg[m_col] * 100).round(1)
                elif m_agg == "mean":
                    agg = plot_df.groupby(group_col)[m_col].mean().reset_index()
                    agg.rename(columns={m_col: "MetricValue"}, inplace=True)
                else:
                    agg = plot_df.groupby(group_col)[m_col].sum().reset_index()
                    agg.rename(columns={m_col: "MetricValue"}, inplace=True)

                agg["MetricValue"] = agg["MetricValue"].round(2)
                agg = agg.sort_values(by="MetricValue", ascending=False).head(15)

                return (
                    alt.Chart(agg)
                    .mark_bar(cornerRadiusTopLeft=6, cornerRadiusTopRight=6)
                    .encode(
                        x=alt.X(f"{group_col}:N", sort="-y", title=group_col, axis=alt.Axis(labelAngle=-20)),
                        y=alt.Y("MetricValue:Q", title=m_label),
                        color=alt.Color("MetricValue:Q", scale=alt.Scale(scheme="blues"), legend=None),
                        tooltip=[
                            alt.Tooltip(f"{group_col}:N", title=group_col),
                            alt.Tooltip("MetricValue:Q", title=m_label, format=".2f")
                        ]
                    )
                    .properties(height=320)
                )

            # TAB 1: ALL DIAGRAMS TOGETHER (Full View)
            with diag_tabs[0]:
                st.markdown("#### 1. Student Telemetry Progress Diagram")
                st.caption("Chronological progression of development sessions with authenticity verification.")
                st.altair_chart(build_progress_chart(), use_container_width=True)

                st.markdown("---")
                st.markdown("#### 2. Forensic Behavioral Matrix (Typing Speed vs. Paste Ratio)")
                st.caption("Clusters authentic developers vs. bulk AI text paste anomalies.")
                st.altair_chart(build_behavioral_matrix(), use_container_width=True)

                st.markdown("---")
                st.markdown("#### 3. Risk Tier & Authenticity Score Distribution")
                c_left, c_right = st.columns(2)
                t_bar, s_hist = build_risk_distribution()
                with c_left:
                    st.caption("Risk Tier Classification Breakdown")
                    st.altair_chart(t_bar, use_container_width=True)
                with c_right:
                    st.caption("Score Spread Histogram (0% - 100%)")
                    st.altair_chart(s_hist, use_container_width=True)

                st.markdown("---")
                st.markdown("#### 4. Cohort Comparison")
                st.altair_chart(build_cohort_comparison("Student Name"), use_container_width=True)

            # TAB 2: PROGRESS TRACKER
            with diag_tabs[1]:
                st.markdown("#### Student Telemetry Progress Diagram")
                st.altair_chart(build_progress_chart(), use_container_width=True)

            # TAB 3: BEHAVIORAL MATRIX
            with diag_tabs[2]:
                st.markdown("#### Forensic Behavioral Matrix: Typing Speed (CPM) vs. Paste Ratio")
                st.altair_chart(build_behavioral_matrix(), use_container_width=True)

            # TAB 4: RISK & SCORE BREAKDOWN
            with diag_tabs[3]:
                st.markdown("#### Risk Classification & Score Breakdown")
                c1, c2 = st.columns(2)
                t_bar2, s_hist2 = build_risk_distribution()
                with c1:
                    st.caption("Risk Tier Classification Counts")
                    st.altair_chart(t_bar2, use_container_width=True)
                with c2:
                    st.caption("Authenticity Score Spectrum")
                    st.altair_chart(s_hist2, use_container_width=True)

            # TAB 5: COHORT COMPARISON
            with diag_tabs[4]:
                st.markdown("#### Student & Assignment Cohort Comparison")
                cmp_c1, cmp_c2 = st.columns([1, 3])
                with cmp_c1:
                    sel_group = st.radio("Group By:", ["Student Name", "Assignment"], key="tab_cmp_group")
                    metric_opts = [
                        ("Mean Authenticity Score (%)", "_auth_pct", "mean"),
                        ("Total Keystrokes", "Keystrokes", "sum"),
                        ("Mean Typing Speed (CPM)", "Typing CPM", "mean"),
                        ("Mean Paste Ratio (%)", "Paste Ratio", "mean"),
                        ("Total Duration (min)", "Duration (min)", "sum")
                    ]
                    sel_metric = st.selectbox("Metric:", metric_opts, format_func=lambda x: x[0], key="tab_cmp_metric")
                with cmp_c2:
                    st.altair_chart(build_cohort_comparison(sel_group, sel_metric), use_container_width=True)

            # TAB 6: CUSTOM METRIC EXPLORER
            with diag_tabs[5]:
                st.markdown("#### Custom Multi-Metric Telemetry Explorer")
                st.caption("Plot any two metrics against each other to discover patterns or inspect outlier sessions.")
                e1, e2, e3 = st.columns(3)
                num_options = [
                    ("Typing Speed (CPM)", "Typing CPM"),
                    ("Paste Ratio", "Paste Ratio"),
                    ("Keystroke Count", "Keystrokes"),
                    ("Duration (min)", "Duration (min)"),
                    ("Code Churn Ratio", "Churn Ratio"),
                    ("Net Lines", "Net Lines"),
                    ("Authenticity Score (%)", "_auth_pct"),
                    ("Suspicion Score (%)", "_susp_pct"),
                    ("Keystroke Efficiency", "K-Eff (keys/line)"),
                    ("Paste Count", "Paste Count")
                ]
                avail_nums = [o for o in num_options if o[1] in plot_df.columns]
                with e1:
                    x_choice = st.selectbox("X-Axis Metric", avail_nums, index=0, format_func=lambda x: x[0], key="exp_all_x")
                with e2:
                    y_idx = 1 if len(avail_nums) > 1 else 0
                    y_choice = st.selectbox("Y-Axis Metric", avail_nums, index=y_idx, format_func=lambda x: x[0], key="exp_all_y")
                with e3:
                    cat_options = [c for c in ["Risk Tier", "Student Name", "Assignment", "Review Status"] if c in plot_df.columns]
                    color_choice = st.selectbox("Color Dimension", cat_options, index=0, key="exp_all_c")

                custom_scatter = (
                    alt.Chart(plot_df)
                    .mark_circle(size=120, opacity=0.8, stroke="#334155", strokeWidth=0.8)
                    .encode(
                        x=alt.X(f"{x_choice[1]}:Q", title=x_choice[0]),
                        y=alt.Y(f"{y_choice[1]}:Q", title=y_choice[0]),
                        color=(
                            alt.Color("Risk Tier:N", scale=risk_color_scale, title="Risk Classification")
                            if color_choice == "Risk Tier"
                            else alt.Color(f"{color_choice}:N", title=color_choice)
                        ),
                        size=alt.Size("Duration (min):Q", title="Duration (min)", scale=alt.Scale(range=[60, 400])),
                        tooltip=[
                            alt.Tooltip("Student Name:N", title="Student"),
                            alt.Tooltip("Assignment:N", title="Assignment"),
                            alt.Tooltip("Authenticity Score:N", title="Authenticity"),
                            alt.Tooltip("Risk Tier:N", title="Risk Tier"),
                            alt.Tooltip(f"{x_choice[1]}:Q", title=x_choice[0]),
                            alt.Tooltip(f"{y_choice[1]}:Q", title=y_choice[0]),
                        ]
                    )
                    .properties(height=360)
                    .interactive()
                )
                st.altair_chart(custom_scatter, use_container_width=True)

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
