Add experiment onboarding# CollabIntel: Participant Experimental Protocol & Study Brief

**Project:** Student Authenticity & Contribution Analysis  
**Study Phase:** Volunteer Pilot Study ($N = 15\text{--}20$ Participants)  
**Target Platform:** VS Code Extension (`student-contribution-tracker-2.0.0.vsix`)

---

## 1. Experimental Setup & Counterbalancing Matrix

To eliminate **learning effects** (domain familiarity) and **cognitive fatigue** as confounding variables, the participant cohort is partitioned into two balanced groups following a $2 \times 2$ Latin Square design:

| Cohort | Target Count | Task Sequence | Condition Breakdown |
|---|---|---|---|
| **Group 1** | 8–10 Students | **Task A $\longrightarrow$ Task B** | Manual Genuine First (Ground Truth: Class 0) $\to$ AI-Assisted Second (Ground Truth: Class 1) |
| **Group 2** | 8–10 Students | **Task B $\longrightarrow$ Task A** | AI-Assisted First (Ground Truth: Class 1) $\to$ Manual Genuine Second (Ground Truth: Class 0) |

---

## 2. Calibrated Task Prompts (~50–70 Lines of Code Each)

Both tasks are calibrated for equal algorithmic difficulty, equal conceptual depth, and similar target LOC to ensure the ML classifier evaluates **authenticity markers** rather than **task difficulty**.

### Task A: In-Memory Rate Limiter (Token Bucket Algorithm)
* **Ground Truth:** Genuine Human Coding (Class 0)
* **Allowed Tools:** VS Code only. Standard language documentation allowed. **No AI assistance or copy-pasting.**
* **Objective:** Implement a class `TokenBucketRateLimiter` managing per-client request quotas.
* **Functional Requirements:**
  1. `allowRequest(clientId: string): boolean`: Returns `true` if client has available tokens; consumes 1 token. Returns `false` if bucket is empty.
  2. `refillTokens(clientId: string): void`: Lazily computes tokens elapsed since last request based on fill rate (e.g., 2 tokens/sec up to capacity 10).
  3. Tracks timestamps and token balances independently per client.

---

### Task B: Event-Driven Pub/Sub Broker with Topic Wildcards
* **Ground Truth:** AI-Assisted / Pasted (Class 1)
* **Allowed Tools:** Browser LLM (ChatGPT / Claude Web). Prompt the model, copy the solution, and paste into VS Code.
* **Objective:** Implement a class `MessageBroker` supporting dynamic topic subscriptions with single-level wildcards.
* **Functional Requirements:**
  1. `subscribe(topic: string, callback: (payload: any) => void): string`: Registers subscriber and returns subscription ID.
  2. `publish(topic: string, payload: any): number`: Dispatches event to all matching subscribers and returns dispatch count.
  3. `unsubscribe(subscriptionId: string): boolean`: Removes listener by subscription ID.
  4. Single-level wildcard routing: matching pattern `orders.*` must match `orders.created` and `orders.cancelled`.

---

## 3. Standardized AI Modality Constraints (Task B Only)

To prevent multimodal noise across different AI interfaces (inline ghost text vs. web copy-paste), the pilot enforces a **single standardized modality**:
* **Allowed:** Web Browser LLM (ChatGPT, Claude Web).
* **Workflow:** Participants prompt the web model, copy the code block, and paste it into their VS Code workspace.
* **Restricted during this pilot:** Inline Copilot ghost-text tab completion and autonomous terminal agents (Cursor Composer / Aider) are disabled to guarantee clean statistical separation for paste burst velocity ($v_{\text{paste}}$) modeling.

---

## 4. Participant Step-by-Step Instructions

1. **Install Extension:**
   * In VS Code: `Ctrl+Shift+P` $\to$ **Extensions: Install from VSIX...** $\to$ Select `student-contribution-tracker-2.0.0.vsix`.
2. **Onboarding Dialog:**
   * On workspace launch, enter your assigned Participant ID: `P01` to `P20`.
   * Select your starting task mode according to your assigned group:
     * `Task A (Manual)` for Group 1.
     * `Task B (AI-Assisted)` for Group 2.
3. **Switching Between Tasks:**
   * When finishing your first task, open Command Palette (`Ctrl+Shift+P`) and run:
     ```
     CollabIntel: Experiment: Switch Current Task (Task A / Task B)
     ```
   * Select the second condition and begin the next task.
4. **Offline Backup (Campus Wi-Fi Failsafe):**
   * If network connection drops or server is unreachable, run:
     ```
     CollabIntel: Experiment: 1-Click Export Local Telemetry Database (.sqlite)
     ```
   * Save the `.sqlite` file and submit it via the post-session form.

---

## 5. Post-Session 3-Question Honesty Exit Check (Google Form)

Upon completing both sessions, participants fill out this anonymous 60-second questionnaire:

1. **Task A Honesty Check:**  
   *During Task A (Manual), did you look up, copy, or consult AI tools or external forums for logic/syntax?*  
   `[ ] No (100% genuine manual coding)`  
   `[ ] Yes, consulted syntax briefly`  
   `[ ] Yes, copied snippet (>10 lines)` *(Anonymous; used solely for ground-truth outlier vetting)*

2. **Environment Stability:**  
   *Did your VS Code environment crash, freeze, or experience noticeable lag (>1 s) during tracking?*  
   `[ ] No, smooth operation`  
   `[ ] Yes, minor lag`  
   `[ ] Yes, had to restart VS Code`

3. **External Modifications:**  
   *Did you write, edit, or generate any code in a tool or editor outside this VS Code window?*  
   `[ ] No`  
   `[ ] Yes (please specify tool/terminal)`
