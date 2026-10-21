# 🧠 INCODE — Machine Learning Telemetry Authenticity Engine

> **Academic Panel Defense & Viva Technical Architecture Guide**  
> Evaluates student telemetry to distinguish genuine human coding from AI code generation and unreflective bulk copy-pasting using continuous probability scoring.

---

## 📁 Repository Architecture (Streamlit-Powered)

```
ml_model/
├── 📂 data/                         # Telemetry datasets & feature matrices
│   ├── dataset.csv                  # Ground-truth training dataset (32 features, 1 row per student session)
│   ├── preprocessed_features.csv    # 13-feature numerical matrix ready for model fitting
│   └── ground_truth_audit.csv       # Quarantined audit metadata for verification
│
├── 📂 artifacts/                    # Serialized model weights & defense metadata
│   ├── authenticity_classifier.joblib # Production trained XGBoost / Ensemble model bundle
│   └── model_metadata.json          # GroupKFold validation ROC-AUC metrics & feature weights
│
├── 📂 src/                          # Core Machine Learning Pipeline
│   ├── __init__.py                  # Package exports
│   ├── config.py                    # Hyperparameters, feature lists, thresholds, risk tiers
│   ├── preprocess.py                # 6-point feature engineering pipeline (code churn, CPM, etc.)
│   ├── classifier.py                # Algorithm architectures (XGBoost, Random Forest, HistGB, LogReg)
│   ├── train.py                     # Zero-leakage GroupKFold cross-validation & training
│   └── predict.py                   # Continuous probability scoring (predict_proba) & risk classification
│
├── 🎈 app.py                        # Streamlit Interactive Web Application
│                                    # (Live Telemetry & Text Input Testing, Dataset Explorer, XGBoost Diagnostics)
│
├── 🚀 run_pipeline.py               # Main CLI Pipeline: Preprocess, train, evaluate, and save artifacts
├── ⚡ train.py                      # Root shortcut to src/train.py
├── 🔮 predict.py                    # Root shortcut to src/predict.py
├── 📊 dataset.csv                   # Root dataset reference (1:1 with MongoDB Atlas export)
├── 📦 requirements.txt              # Dependencies (xgboost, scikit-learn, pandas, joblib, streamlit)
└── 📄 README.md                     # Technical architecture documentation
```

---

## 🎈 Streamlit Interactive Application (`app.py`)

Run the Streamlit application with:

```bash
streamlit run app.py
```

### Features included in the Streamlit app:
1. **📝 Enter & Paste Code / Text Data**:
   - Type or paste code directly into a live editor.
   - Automatically computes lines added, typing cadence, and paste ratios.
   - Evaluates authenticity instantly using the trained XGBoost model.
2. **🎛️ Interactive Numerical Sliders**:
   - Tweak typing speed (CPM), keystrokes, lines added/removed, code churn, and paste ratio with live sliders.
   - Test instant presets: *Hand-Written Code*, *ChatGPT Bulk Paste*, and *Copilot Hybrid Autocomplete*.
3. **📊 Dataset Explorer**:
   - Filter and search through real student sessions from `data/dataset.csv`.
   - Filter by authenticity label (0 = Authentic, 1 = AI-Assisted).
4. **📈 Model Evaluation & Feature Importance**:
   - View GroupKFold benchmark metrics (ROC-AUC: 1.0000, Balanced Accuracy: 97.92%).
   - Interactive bar chart showing quantitative feature importance weights for XGBoost.
5. **📁 Batch CSV Predictor**:
   - Upload any CSV of telemetry data to score sessions in batch and export predictions.

---

## 🔬 Core Pipeline Modules

### 1. `data/` — Data Ingestion & Sanitization
- **`dataset.csv`**: Contains real student coding sessions exported from MongoDB Atlas, formatted into 32 columns.
- **`preprocessed_features.csv`**: Numerical 13-feature matrix generated after applying Winsorization, code churn synthesis, and idle-window retention.
- **`ground_truth_audit.csv`**: Post-hoc verification table linking predictions back to participant names, assignment titles, and qualitative coding styles.

### 2. `src/` — Core ML Pipeline
- **`config.py`**: Central source of truth. Configures paths, feature column definitions, GroupKFold splits ($k=5$), and risk tier boundaries ($P < 30\%$ Authentic, $P > 70\%$ AI-Assisted).
- **`preprocess.py`**: Extracts biometric typing velocity, code churn ($\frac{\text{removed}}{\text{added} + \text{removed}}$), and paste ratio.
- **`classifier.py`**: Configures tuned algorithms (XGBoost, Random Forest, HistGradientBoosting, Logistic Regression).
- **`train.py`**: Implements **Student-Level Grouped Cross-Validation (`GroupKFold`)**, guaranteeing that no student's activity windows cross between train and validation folds.
- **`predict.py`**: Implements continuous probability scoring:
  $$P(\text{AI} \mid x) \in [0.0\%, 100.0\%]$$

### 3. `artifacts/` — Model Serialization
- **`authenticity_classifier.joblib`**: Pickled dictionary bundle containing the trained classifier estimator, active feature names, and calibrated threshold boundaries.
- **`model_metadata.json`**: Machine-readable JSON capturing the benchmark results across all candidate models.

---

## 🎯 13 Core Sensor Features

| # | Feature Name | Description | Forensic Intuition |
|---|--------------|-------------|--------------------|
| 1 | `duration_minutes` | Total elapsed session time | Establishes time baseline |
| 2 | `keystrokes` | Physical keys pressed in IDE | Human code requires continuous manual typing |
| 3 | `lines_added` | Gross lines inserted | Distinguishes burst expansions |
| 4 | `lines_removed` | Gross lines deleted | Measures refactoring behavior |
| 5 | `net_lines` | `lines_added - lines_removed` | True net output of the session |
| 6 | `code_churn_ratio` | $\frac{\text{lines\_removed}}{\text{lines\_added} + \text{lines\_removed}}$ | High in natural iterative coding; near 0 in AI dumps |
| 7 | `paste_count` | Number of distinct paste bursts | High frequency indicates clipboard reliance |
| 8 | `characters_pasted` | Total characters inserted via paste | Quantitative volume of external text |
| 9 | `typing_speed_cpm` | Characters per minute ($\text{CPM}$) | Human physiological limit is typically $< 350$ CPM |
| 10 | `keystroke_efficiency_keff` | $\frac{\text{keystrokes}}{\text{lines\_added}}$ | Ratio of physical input to code volume |
| 11 | `paste_ratio` | $\frac{\text{characters\_pasted}}{\text{total\_characters}}$ | Key discriminator for bulk code insertion |
| 12 | `is_offline` | Binary flag (1 if offline sync) | Tracks connection posture |
| 13 | `files_edited_count` | Breadth of files touched | Identifies scattered multi-file mutations |

---

## 🛡️ Panel Defense: Zero-Leakage GroupKFold

In standard K-Fold CV, consecutive 5-minute sliding windows from the same student could appear in both training and test sets, artificially inflating test scores (**data leakage**).

Our pipeline enforces **`GroupKFold(n_splits=5)`** grouped on `student_id`:
- **Guarantee**: All windows belonging to Student $P_{01}$ reside exclusively in the training fold or exclusively in the test fold.
- **Outcome**: The evaluated ROC-AUC reflects the model's true ability to generalize to unseen students.

---

## ⚡ Quick Start Commands

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Launch the Streamlit Interactive Testbed
streamlit run app.py

# 3. Retrain the model on new data
python run_pipeline.py
```
