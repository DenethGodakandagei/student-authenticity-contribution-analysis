# PP1 Defense Cheat Sheet: Methodological Rigor & Threats to Internal Validity

**Project:** Student Authenticity & Contribution Analysis  
**Academic Milestone:** Progress Presentation 1 (PP1)  
**Slide Reference:** *Threats to Validity & Empirical Soundness*

---

## 1. Threats to Internal Validity Matrix

| Potential Threat / Bias | Experimental / Technical Countermeasure | Defensibility Argument for Examiners |
|---|---|---|
| **Order & Fatigue Effect** | $2 \times 2$ Latin Square counterbalancing (Half $A \to B$, half $B \to A$). | Eliminates domain familiarity and mental fatigue as confounding variables in time-series measurements. |
| **Tainted Ground Truth** | Outlier filter ($\text{chars\_pasted} > 150$ on Task A) + Anonymous exit questionnaire. | Prevents silent Class 0 poisoning by vetting unexpected velocity spikes before admitting rows to the training set. |
| **Network Loss on Campus** | Local SQLite WAL buffer + 1-Click `.sqlite` GUI exporter. | Guarantees zero data loss even if university firewalls block port 5000 or the cloud ingestion backend sleeps. |
| **Transcription Attack** | Multi-feature Inter-Keystroke Interval (IKI) variance + Code Churn Ratio ($c_{\text{churn}}$). | Differentiates variable cognitive pauses during genuine problem-solving from uniform visual transcription rhythm. |
| **Git Timestamp Spoofing** | Append-only SHA-256 hash chaining anchored to server-acknowledged clocks. | Detects retroactive `git commit --date` rewriting via chronological mismatches against the immutable event stream. |
| **AI Modality Noise** | Standardized Web LLM constraint for Task B during the initial baseline phase. | Isolates pure paste burst mechanics ($v_{\text{paste}}$) before introducing multimodal Copilot ghost-text complexity. |

---

## 2. Examiner Defense Q&A Preparation

### Q1: *"What if a student copies AI code and manually retypes it line by line? (The Transcription Attack)"*
> **Candidate Response:**  
> "A genuine coder generates code through active problem-solving: pausing at syntax boundaries, backspacing typos, and refactoring logic. This creates high variance in **Inter-Keystroke Intervals (IKI)** and a healthy **Code Churn Ratio** ($0.15 \le \text{churn} \le 0.45$).  
> When a student transcribes from a second screen, they exhibit rhythmic visual saccades (gaze shift $\to$ burst typing $\to$ gaze shift), resulting in uniform IKI distribution, near-zero backspacing ($\text{churn} \approx 0.0$), and elevated words-per-minute with zero semantic edits. Our feature extractor captures both churn ratio and deletion counts to expose this anomaly."

---

### Q2: *"Why segment into 5-minute sliding windows instead of whole-session evaluations?"*
> **Candidate Response:**  
> "Academic assignments are 20+ hour projects. Students do not write 100% genuine code or 100% AI code across an entire multi-week project.  
> Evaluating at the session level averages out behavior and washes away anomalies. A **5-minute sliding window** provides **temporal localization**—pinpointing the exact 10-minute interval where a 200-line paste burst entered an otherwise genuine 3-hour development session."

---

### Q3: *"Can students forge commits or fake working hours using `git commit --date`?"*
> **Candidate Response:**  
> "Git commit timestamps are client-controlled and trivial to backdate or fake with flags like `--date`.  
> Our architecture solves this by maintaining a local, append-only **SQLite buffer with a SHA-256 cryptographic hash chain** (`row_hash = SHA256(prev_hash + ts + payload)`). Every sliding window is bound to real-time events that cannot be retroactively injected without breaking the cryptographic chain."

---

### Q4: *"Isn't keylogging an ethical and privacy violation for students?"*
> **Candidate Response:**  
> "Our extension does **not** capture or store raw keystroke text or clipboard content.  
> We capture strictly quantitative metrics: character count deltas, timing intervals, paste burst sizes, and file diff counts. Sensitive files (`.env`, `.pem`, lockfiles, `node_modules`) are strictly blacklisted at the kernel filter level, and all file paths are stripped of local operating system usernames before logging."
