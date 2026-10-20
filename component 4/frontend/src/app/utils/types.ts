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
  tests?: Record<string, TestRecord>;
  created_at?: string;
  updated_at?: string;
}

/** One question returned by POST /sessions/{id}/tests/{form} (never includes the key). */
export interface TestQuestion {
  id: string;
  concept: string;
  question: string;
  options: string[];
}

/** Stored test question, with scoring fields only after submission. */
export interface StoredTestQuestion extends TestQuestion {
  correct_index?: number;
  explanation?: string;
}

export interface TestAnswer {
  question_id: string;
  choice: number;
}

/** One entry of `tests` inside the session state. */
export interface TestRecord {
  questions: StoredTestQuestion[];
  answers: TestAnswer[];
  score: TestScore | null;
  submitted_at: string | null;
}

/** POST /sessions/{id}/tests/{form} */
export interface TestFormResponse {
  session_id: string;
  form: 'pre' | 'post';
  submitted: boolean;
  questions: TestQuestion[];
}

export interface TestQuestionResult {
  question_id: string;
  concept: string;
  question: string;
  choice: number | null;
  correct_index: number;
  correct: boolean;
  explanation: string;
}

export interface TestConceptResult {
  concept: string;
  correct: number;
  total: number;
  percentage: number;
}

/** Plain-Python scoring returned by the submit route. */
export interface TestScore {
  total_questions: number;
  correct_count: number;
  overall_percentage: number;
  per_question: TestQuestionResult[];
  per_concept: TestConceptResult[];
}

/** POST /sessions/{id}/tests/{form}/submit */
export interface SubmitTestResponse {
  session_id: string;
  form: 'pre' | 'post';
  score: TestScore;
  results: TestQuestionResult[];
  submitted_at: string;
}

export type GainLabel = 'high' | 'medium' | 'low';

/** One per-misconception row of GET /sessions/{id}/evaluation. */
export interface EvaluationConcept {
  concept: string;
  pre_correct: boolean | null;
  post_correct: boolean | null;
  status: string;
  tries: number;
}

export interface EvaluationTeachingStats {
  teacher_turns: number;
  avg_response_seconds: number | null;
  max_response_seconds: number | null;
}

/** GET /sessions/{id}/evaluation */
export interface LearningEvaluation {
  pre_score: number | null;
  post_score: number | null;
  absolute_gain: number | null;
  normalized_gain: number | null;
  per_concept: EvaluationConcept[];
  misconceptions_corrected: number;
  misconceptions_total: number;
  concepts_explained: number;
  teaching_stats: EvaluationTeachingStats;
  gain_label: GainLabel | null;
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

/** POST /sessions/create-nova */
export interface CreateNovaResponse extends CreateSessionResponse {
  message?: string;
}

/** POST /upload-material */
export interface UploadMaterialResponse {
  filename: string;
  session_id: string;
  number_of_pages: number;
  number_of_chunks: number;
  detected_topic: string;
  learning_objectives: string[];
  generated_misconceptions: Array<Record<string, unknown>>;
  nova_state: SessionState;
}

/** One Nova answer inside POST /sessions/{id}/exam. */
export interface ExamQuestionResult {
  question: string;
  type: string;
  expected_answer: number | string;
  nova_answer: string;
  is_correct: boolean;
}

/** POST /sessions/{id}/exam */
export interface ExamResponse {
  session_id: string;
  total_questions: number;
  score: number;
  correct_answers: ExamQuestionResult[];
  incorrect_answers: ExamQuestionResult[];
  remaining_misconceptions: MisconceptionState[];
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
