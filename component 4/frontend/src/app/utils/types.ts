// app/utils/types.ts
// Shapes returned by backend/app/main.py and backend/app/nova_agent.py.

/** GET /sessions/{id}/summary and the `understanding` key of a chat response. */
export interface UnderstandingConcept {
  concept: string;
  status: string;
  tries: number;
  score: number | null;
  source_pages?: number[];
}

export interface UnderstandingSummary {
  misconceptions: UnderstandingConcept[];
  overall_score: number | null;
}

/** One misconception inside the session state (`nova.to_dict()`). */
export interface MisconceptionState {
  id: string;
  wrong_concept: string;
  correct_concept: string;
  reason: string;
  concept: string;
  source_pages: number[];
  source_quote: string;
  confidence: number;
  status: string;
  is_corrected: boolean;
  corrected_at?: string | null;
  user_explanation?: string | null;
}

/** Timestamped entry of `state.events` ({time, type, ...}). */
export interface SessionEvent {
  time: string;
  type: string;
  text?: string;
  [key: string]: unknown;
}

/** GET /sessions/{id}, `updated_state` of a chat response and `state` of create-from-kb. */
export interface SessionState {
  session_id: string;
  topic: string;
  name?: string;
  kb_id?: string;
  learning_objectives?: string[];
  misconceptions: MisconceptionState[];
  conversation_history: Array<{ role: string; content: string }>;
  events: SessionEvent[];
  created_at?: string;
  updated_at?: string;
}

/** `detection` key of a chat response (one entry per still-held misconception). */
export interface DetectionItem {
  id: string;
  still_present: boolean;
  evidence: string;
  confidence: number;
}

/** POST /sessions/create-from-kb */
export interface CreateSessionResponse {
  session_id: string;
  state: SessionState;
}

/** One row of GET /sessions */
export interface SessionListItem {
  session_id: string;
  topic: string;
  created_at?: string | null;
  updated_at?: string | null;
  learned_count: number;
  total_count: number;
}

/** POST /sessions/{id}/chat */
export type CheckResult = 'passed' | 'failed' | 'needs_review';

export interface ChatResponse {
  session_id: string;
  topic: string;
  teacher_message: string;
  nova_response: string;
  newly_corrected_ids: string[];
  learning_progress: {
    corrected_misconceptions: unknown[];
    remaining_misconceptions: unknown[];
    learning_percentage: number;
  };
  unresolved_misconceptions_count: number;
  learned_misconceptions_count: number;
  check_question: string | null;
  check_result: CheckResult | null;
  check_feedback: string | null;
  understanding: UnderstandingSummary;
  detection: DetectionItem[];
  conversation_history: Array<{ role: string; content: string }>;
  updated_state: SessionState;
}

/** FastAPI HTTPException body: {detail: "..."} */
export interface ApiError {
  detail?: string;
}
