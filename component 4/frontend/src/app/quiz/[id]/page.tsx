// app/quiz/[id]/page.tsx
'use client';

import { use, useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import QuizFeedback from '../../components/QuizFeedback';
import {
  apiRequest,
  getAccessToken,
  getServerAuthSnapshot,
  subscribeAuth,
} from '../../utils/api';
import type {
  ApiError,
  QuizAnswerResponse,
  QuizConceptState,
  QuizPublicQuestion,
  QuizStateResponse,
} from '../../utils/types';
import '../../components/quiz/quiz.css';

const ANGLE_LABELS: Record<string, string> = {
  definition: 'Definition',
  application: 'Application',
  code_trace: 'Code trace',
  spot_the_error: 'Spot the error',
  compare_why: 'Compare and explain',
};

const STATUS_LABELS: Record<string, string> = {
  new: 'Not started',
  practicing: 'Practicing',
  mastered: 'Mastered',
  needs_review: 'Needs review',
};

function angleLabel(angle: string): string {
  return ANGLE_LABELS[angle] ?? angle.replace(/_/g, ' ');
}

function ConceptChips({
  concepts,
  current,
}: {
  concepts: QuizConceptState[];
  current: string | null;
}) {
  return (
    <div className="quiz-progress" aria-label="Concept progress">
      {concepts.map((concept) => (
        <div
          key={concept.name}
          className={`quiz-chip is-${concept.status}${
            concept.name === current ? ' is-current' : ''
          }`}
          title={`${STATUS_LABELS[concept.status] ?? concept.status} · ${Math.min(
            concept.streak,
            3
          )} of 3 confident correct answers`}
        >
          <span className="quiz-chip__name">{concept.name}</span>
          <span className="quiz-chip__footer">
            <span className="quiz-chip__status">
              {STATUS_LABELS[concept.status] ?? concept.status}
            </span>
            <span
              className="quiz-chip__dots"
              aria-label={`${Math.min(concept.streak, 3)} of 3 streak`}
            >
              {[0, 1, 2].map((dot) => (
                <span
                  key={dot}
                  className={`quiz-chip__dot${
                    dot < Math.min(concept.streak, 3) ? ' is-on' : ''
                  }`}
                />
              ))}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

function LoadingCard({ label }: { label: string }) {
  return (
    <section className="quiz-card quiz-card--center" aria-live="polite">
      <span className="quiz-spinner" aria-hidden="true" />
      <h2 className="quiz-card__title">{label}</h2>
      <p className="quiz-muted">Nova is writing a grounded question from your material.</p>
    </section>
  );
}

export default function QuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: quizId } = use(params);
  const router = useRouter();
  const token = useSyncExternalStore(subscribeAuth, getAccessToken, getServerAuthSnapshot);
  const startedRef = useRef(false);
  const generatingRef = useRef(false);

  const [quiz, setQuiz] = useState<QuizStateResponse | null>(null);
  const [question, setQuestion] = useState<QuizPublicQuestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const [confident, setConfident] = useState<boolean | null>(null);
  const [reasoning, setReasoning] = useState('');
  const [feedback, setFeedback] = useState<QuizAnswerResponse | null>(null);

  useEffect(() => {
    if (!token) router.replace('/login');
  }, [token, router]);

  const refreshQuiz = useCallback(async () => {
    const res = await apiRequest<QuizStateResponse & ApiError>(
      `/quizzes/${quizId}`,
      'GET'
    );
    if (res.ok && res.data?.quiz_id) setQuiz(res.data);
  }, [quizId]);

  const generateNext = useCallback(async () => {
    if (generatingRef.current) return;
    generatingRef.current = true;
    setGenerating(true);
    setActionError('');
    setQuestion(null);
    setFeedback(null);
    setSelected(null);
    setConfident(null);
    setReasoning('');

    const res = await apiRequest<QuizPublicQuestion & ApiError>(
      `/quizzes/${quizId}/next`,
      'POST'
    );
    generatingRef.current = false;
    setGenerating(false);

    if (res.ok && res.data?.question_id) {
      setQuestion(res.data);
      return;
    }

    if (res.status === 409) {
      setQuestion(null);
      void refreshQuiz();
      router.replace(`/quiz/${quizId}/summary`);
      return;
    }

    setActionError(res.data?.detail ?? res.error ?? 'Could not load the next question.');
  }, [quizId, refreshQuiz, router]);

  const loadQuiz = useCallback(async () => {
    const res = await apiRequest<QuizStateResponse & ApiError>(
      `/quizzes/${quizId}`,
      'GET'
    );
    setLoading(false);

    if (!res.ok || !res.data?.quiz_id) {
      setLoadError(res.data?.detail ?? res.error ?? 'Could not load this quiz.');
      return;
    }

    const data = res.data;
    setQuiz(data);
    if (data.current_question) {
      setQuestion(data.current_question);
      return;
    }

    setQuestion(null);
    if (data.finished) {
      router.replace(`/quiz/${quizId}/summary`);
      return;
    }

    if (!startedRef.current) {
      startedRef.current = true;
      void generateNext();
    }
  }, [generateNext, quizId, router]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    apiRequest<QuizStateResponse & ApiError>(`/quizzes/${quizId}`, 'GET').then((res) => {
      if (cancelled) return;
      setLoading(false);

      if (!res.ok || !res.data?.quiz_id) {
        setLoadError(res.data?.detail ?? res.error ?? 'Could not load this quiz.');
        return;
      }

      const data = res.data;
      setQuiz(data);
      if (data.current_question) {
        setQuestion(data.current_question);
        return;
      }

      setQuestion(null);
      if (data.finished) {
        router.replace(`/quiz/${quizId}/summary`);
        return;
      }

      if (!startedRef.current) {
        startedRef.current = true;
        void generateNext();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [token, quizId, generateNext, router]);

  const submitAnswer = async () => {
    if (!question || selected === null || confident === null || submitting) return;
    setSubmitting(true);
    setActionError('');

    const res = await apiRequest<QuizAnswerResponse & ApiError>(
      `/quizzes/${quizId}/answer`,
      'POST',
      {
        question_id: question.question_id,
        choice: selected,
        confident,
        reasoning,
      }
    );
    setSubmitting(false);

    if (res.ok && typeof res.data?.correct === 'boolean') {
      setFeedback(res.data);
      void refreshQuiz();
      return;
    }

    setActionError(res.data?.detail ?? res.error ?? 'Could not check that answer.');
  };

  const goNext = () => {
    const done = feedback?.finished ?? false;
    if (done) {
      setQuestion(null);
      setFeedback(null);
      router.push(`/quiz/${quizId}/summary`);
      return;
    }
    void generateNext();
  };

  if (!token) {
    return (
      <main className="quiz-loading">
        <span className="quiz-spinner" aria-hidden="true" />
      </main>
    );
  }

  const conceptIndex = question
    ? (quiz?.concepts.findIndex((concept) => concept.name === question.concept) ?? -1) + 1
    : 0;

  return (
    <div className="quiz-page">
      <main className="quiz-container">
        <div className="quiz-topbar">
          <Link href="/dashboard" className="quiz-back">
            ← Dashboard
          </Link>
          {quiz && (
            <span className="quiz-percent">
              {quiz.progress.completed} / {quiz.progress.total} complete
            </span>
          )}
        </div>

        <header className="quiz-header">
          <p className="quiz-eyebrow">Adaptive quiz</p>
          <h1 className="quiz-title">{quiz?.kb_name ?? 'Your quiz'}</h1>
          <p className="quiz-subtitle">
            Three confident correct answers across different angles masters a concept.
            Wrong answers come back with a new question.
          </p>
        </header>

        {quiz && <ConceptChips concepts={quiz.concepts} current={quiz.current_concept} />}

        {loading && !quiz ? (
          <LoadingCard label="Loading your quiz…" />
        ) : loadError && !quiz ? (
          <section className="quiz-card quiz-card--center">
            <p className="quiz-alert" role="alert">
              {loadError}
            </p>
            <button
              type="button"
              className="quiz-btn"
              onClick={() => {
                setLoading(true);
                setLoadError('');
                void loadQuiz();
              }}
            >
              Retry
            </button>
          </section>
        ) : generating ? (
          <LoadingCard label="Writing your next question…" />
        ) : question ? (
          <section className="quiz-card" aria-live="polite">
            <div className="quiz-question__meta">
              <span>
                {conceptIndex > 0 && quiz
                  ? `Concept ${conceptIndex} of ${quiz.concepts.length}`
                  : 'Question'}
              </span>
              <span>{angleLabel(question.angle)}</span>
            </div>
            <h2 className="quiz-question">{question.question}</h2>

            <div className="quiz-options" role="group" aria-label="Answer choices">
              {question.options.map((option, index) => {
                let tone = '';
                if (feedback) {
                  if (index === feedback.correct_index) tone = 'is-correct';
                  else if (index === selected) tone = 'is-wrong';
                  else tone = 'is-dim';
                } else if (selected === index) {
                  tone = 'is-selected';
                }

                return (
                  <button
                    key={`${question.question_id}-${index}`}
                    type="button"
                    className={`quiz-option${tone ? ` ${tone}` : ''}`}
                    onClick={() => {
                      if (!feedback) setSelected(index);
                    }}
                    disabled={Boolean(feedback) || submitting}
                    aria-pressed={selected === index}
                  >
                    <span className="quiz-option__letter">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span>{option}</span>
                  </button>
                );
              })}
            </div>

            {actionError && (
              <p className="quiz-alert" role="alert">
                {actionError}
              </p>
            )}

            {feedback ? (
              <QuizFeedback
                feedback={feedback}
                question={question}
                selected={selected ?? 0}
                kbId={quiz?.kb_id ?? ''}
                onNext={goNext}
              />
            ) : (
              <>
                <div className="quiz-confidence">
                  <p className="quiz-label">How confident are you?</p>
                  <div className="quiz-confidence__buttons">
                    <button
                      type="button"
                      className={`quiz-choice${
                        confident === true ? ' is-selected' : ''
                      }`}
                      onClick={() => setConfident(true)}
                      disabled={submitting}
                      aria-pressed={confident === true}
                    >
                      Sure
                    </button>
                    <button
                      type="button"
                      className={`quiz-choice${
                        confident === false ? ' is-selected' : ''
                      }`}
                      onClick={() => setConfident(false)}
                      disabled={submitting}
                      aria-pressed={confident === false}
                    >
                      Not sure
                    </button>
                  </div>
                </div>

                <label className="quiz-reasoning">
                  <span className="quiz-label">Reasoning (optional)</span>
                  <textarea
                    value={reasoning}
                    onChange={(event) => setReasoning(event.target.value)}
                    placeholder="Why did you choose that answer?"
                    rows={3}
                    maxLength={500}
                    disabled={submitting}
                  />
                </label>

                <button
                  type="button"
                  className="quiz-btn quiz-btn--wide"
                  onClick={() => void submitAnswer()}
                  disabled={selected === null || confident === null || submitting}
                >
                  {submitting && <span className="quiz-spinner quiz-spinner--sm" />}
                  {submitting ? 'Checking…' : 'Submit answer'}
                </button>
              </>
            )}
          </section>
        ) : quiz?.finished ? (
          <LoadingCard label="Opening your summary…" />
        ) : (
          <section className="quiz-card quiz-card--center">
            <p className="quiz-alert" role="alert">
              {actionError || 'No question is available yet.'}
            </p>
            <button
              type="button"
              className="quiz-btn"
              onClick={() => void generateNext()}
            >
              Retry
            </button>
          </section>
        )}
      </main>
    </div>
  );
}
