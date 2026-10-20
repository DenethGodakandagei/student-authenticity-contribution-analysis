# Backend AGENTS.md — Nova

## Project

"Nova" is a RAG-grounded AI virtual student for OOP education. A human student teaches
Nova; Nova holds course-grounded misconceptions extracted from the student's own lecture
PDF. Nova's knowledge state starts from those misconceptions and updates as the student
teaches it.

## Ten-Stage Pipeline

1. Learning Material Input
2. Knowledge Extraction (chunk + embed + retrieve)
3. Misconception Generation
4. Nova Persona Creation
5. Teaching Interaction
6. Misconception Detection
7. Knowledge Update
8. Adaptive Misconception Testing
9. Student Learning Evaluation
10. Analytics and Learning Report

## Current Sprint Scope

- Stages 1–6: fully implemented.
- Stages 7–8: minimal implementation.
- Stages 9–10: in scope (pre/post-test, learning-gain evaluation, student report, lecturer
  analytics, feedback loop).

## Stack

- FastAPI backend in `backend/app` (entry: `app/main.py`).
- Local LLM through Ollama; settings in `app/config.py` (`Settings` via pydantic-settings,
  `.env` supported). Default model: `phi3` at `http://localhost:11434`.
- LLM providers are abstracted in `app/llm.py` (`BaseLLMProvider`,
  `get_llm_provider()`); options: ollama, openai, huggingface, mock.
- Next.js frontend in `/frontend` (talks to these API routes).

### Backend Modules (`backend/app/`)

- `main.py` — FastAPI app, CORS, routes.
- `config.py` — central `Settings` singleton.
- `llm.py` — LLM provider abstraction (Ollama REST by default).
- `pdf_processor.py` — Stage 1–2: PDF text extraction and chunking.
- `misconception_generator.py` — Stage 3: Atlas agent generating misconceptions as
  Pydantic-validated JSON (`MisconceptionAnalysisResult`).
- `nova_agent.py` — Stages 4–7: `NovaState` / `MisconceptionState` models and
  `NovaStudentAgent` (persona, chat responses, misconception correction, state
  persistence to `sessions/*.json`). Factories: `from_atlas_output`,
  `from_repository(kb_id, ...)` (KB-grounded sessions with `source_pages` /
  `source_quote` / `status`); every turn appends `events` entries
  (`teacher_message`, `correction_check`, `nova_reply`).
- `assessment_generator.py` — Stage 8: generates assessment questions from Nova's
  current misconceptions (used by the exam endpoint).

### API Routes (frontend depends on these)

- `GET /`
- `POST /upload-material` — PDF upload; runs PDF processing, misconception generation,
  and Nova session creation; returns `filename`, `session_id`, `number_of_pages`,
  `number_of_chunks`, `detected_topic`, `learning_objectives`,
  `generated_misconceptions`, `nova_state`.
- `POST /sessions/create-nova` — creates a session from atlas output.
- `POST /sessions/create-from-kb` — body `{kb_id, misconception_ids?, count?}`; creates a
  session from `knowledge/{kb_id}/misconceptions.json` (picks `count` items from distinct
  concepts when ids are omitted); returns `session_id`, `state`; 404 unknown kb,
  400 unknown misconception ids.
- `GET /sessions/{session_id}` — returns full Nova state.
- `POST /sessions/{session_id}/exam` — Stage 8 exam: generates questions, has Nova
  answer, scores, returns `correct_answers`, `incorrect_answers`,
  `remaining_misconceptions`, etc.
- `POST /sessions/{session_id}/chat` and `POST /teaching-session/{session_id}/chat` —
  teaching interaction; returns `nova_response`, `newly_corrected_ids`,
  `learning_progress`, counts, `conversation_history`, `updated_state`.

## Rules

- Any LLM output that drives program logic must be JSON validated with Pydantic models,
  with one retry on parse failure.
- Chat replies from Nova use plain text mode, never JSON mode.
- Never include `correct_concept` or the correct answer in Nova's persona prompt.
- Do not change existing API route paths or response keys that the frontend uses without
  telling the user first.
- Every misconception must carry source page numbers and a short verbatim source quote.
- Keep new code in small modules under `backend/app` with simple functions and
  docstrings.
- New backend code goes in small modules under `backend/app`; routers in their own file,
  included from `main.py`. Never rename existing routes or response keys.
- New `NovaState` fields must have defaults so old session JSON files still load.
- Test scoring and all metrics are computed in plain Python, never by the LLM. LLM output
  that drives logic uses `generate_json` + Pydantic.
- Never send answer keys (`correct_index`) to the client before a test is submitted,
  including through `GET /sessions/{id}`.
- Frontend: use `apiRequest` from `utils/api.ts`, put response types in
  `utils/types.ts`, match the existing dark card styling. Read
  `node_modules/next/dist/docs` before writing Next.js code.
- After each task: run the related backend test script and `npx tsc --noEmit` in
  frontend, and fix errors.

## Notes

- Session state is persisted as JSON files under `backend/sessions/`; uploads land in
  `backend/uploads/`.
- Test scripts live at the `backend/` root (`test_*.py`).

# code for run the model

.venv\Scripts\Activate.ps1
