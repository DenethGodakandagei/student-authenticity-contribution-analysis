// app/components/TestRunner.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiRequest } from '../utils/api';
import type {
  ApiError,
  SubmitTestResponse,
  TestFormResponse,
  TestQuestion,
} from '../utils/types';
import './dashboard/dashboard.css';

type TestForm = 'pre' | 'post';

export default function TestRunner({
  sessionId,
  form,
}: {
  sessionId: string;
  form: TestForm;
}) {
  const router = useRouter();
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, number | number[]>>({});
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<SubmitTestResponse | null>(null);

  const title = form === 'pre' ? 'Pre-test' : 'Post-test';
  const subtitle =
    form === 'pre'
      ? 'Assess your baseline knowledge before teaching Nova. Don’t worry if you get some wrong!'
      : 'Demonstrate your understanding and measured learning gains after tutoring Nova.';

  const afterSubmitPath =
    form === 'pre' ? `/session/${sessionId}/study` : `/session/${sessionId}/report`;

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const res = await apiRequest<TestFormResponse & ApiError>(
        `/sessions/${sessionId}/tests/${form}`,
        'POST'
      );
      if (cancelled) return;
      setLoading(false);

      if (res.ok && res.data?.questions?.length) {
        if (res.data.submitted) {
          router.replace(afterSubmitPath);
          return;
        }
        setQuestions(res.data.questions);
        return;
      }
      setError(
        res.data?.detail ??
          res.error ??
          `Could not load the ${form}-test. Please try again.`
      );
    };
    load();

    return () => {
      cancelled = true;
    };
  }, [sessionId, form, router, afterSubmitPath]);

  const current = questions[index];
  const currentAnswer = current ? answers[current.id] : undefined;
  const answered = current
    ? current.is_multiple
      ? Array.isArray(currentAnswer) && currentAnswer.length > 0
      : currentAnswer !== undefined
    : false;

  const allAnswered =
    questions.length > 0 &&
    questions.every((q) => {
      const a = answers[q.id];
      return q.is_multiple ? Array.isArray(a) && a.length > 0 : a !== undefined;
    });

  const toggleOption = (optionIndex: number) => {
    if (!current) return;
    if (current.is_multiple) {
      setAnswers((prev) => {
        const existing = Array.isArray(prev[current.id]) ? (prev[current.id] as number[]) : [];
        const next = existing.includes(optionIndex)
          ? existing.filter((i) => i !== optionIndex)
          : [...existing, optionIndex];
        return { ...prev, [current.id]: next };
      });
    } else {
      setAnswers((prev) => ({ ...prev, [current.id]: optionIndex }));
    }
  };

  const submit = async () => {
    if (submitting || !allAnswered) return;
    setSubmitting(true);
    setError('');

    const payload = {
      answers: questions.map((q) => {
        const val = answers[q.id];
        if (q.is_multiple) {
          return {
            question_id: q.id,
            choices: Array.isArray(val) ? val : [],
          };
        }
        return {
          question_id: q.id,
          choice: typeof val === 'number' ? val : 0,
        };
      }),
    };
    const res = await apiRequest<SubmitTestResponse & ApiError>(
      `/sessions/${sessionId}/tests/${form}/submit`,
      'POST',
      payload
    );
    setSubmitting(false);

    if (res.ok && res.data?.score) {
      setResult(res.data);
      return;
    }
    setError(res.data?.detail ?? res.error ?? 'Could not submit this test. Please try again.');
  };

  const [prepStep, setPrepStep] = useState(0);

  const PREP_STEPS = [
    {
      title: 'Retrieving Session Knowledge',
      desc: 'Loading key concept definitions and misconceptions from your uploaded material...',
    },
    {
      title: 'Formulating Questions with LLM',
      desc: 'Creating targeted diagnostic multiple-choice questions to assess baseline knowledge...',
    },
    {
      title: 'Finalizing Evaluation Matrix',
      desc: 'Calibrating answer keys and building your interactive assessment room...',
    },
  ];

  useEffect(() => {
    if (!loading) return;
    const t1 = setTimeout(() => setPrepStep(1), 3000);
    const t2 = setTimeout(() => setPrepStep(2), 9000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [loading]);

  if (loading) {
    return (
      <div className="dash-page">
        <main className="dash-container">
          <section
            className="dash-card"
            style={{
              padding: '2.5rem 1.5rem',
              maxWidth: '680px',
              margin: '0 auto',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.5rem' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'rgba(111, 175, 154, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#3e8b75',
                  flexShrink: 0,
                }}
              >
                <div className="dash-btn__spinner" style={{ width: '22px', height: '22px', borderWidth: '2.5px', borderTopColor: '#3e8b75' }} />
              </div>
              <div>
                <h1 className="dash-greeting__title" style={{ fontSize: '1.25rem', margin: 0 }}>
                  Preparing your {title}…
                </h1>
                <p className="dash-greeting__text" style={{ margin: 0, fontSize: '0.85rem' }}>
                  Generating tailored questions for your session concepts. This takes a few moments.
                </p>
              </div>
            </div>

            {/* Steps Container */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
              {PREP_STEPS.map((step, idx) => {
                const isDone = idx < prepStep;
                const isCurrent = idx === prepStep;

                let iconColor = '#94a3b8';
                let circleBg = '#e2e8f0';
                let titleColor = '#64748b';

                if (isDone) {
                  iconColor = '#ffffff';
                  circleBg = '#3e8b75';
                  titleColor = '#1f2937';
                } else if (isCurrent) {
                  iconColor = '#ffffff';
                  circleBg = '#6faf9a';
                  titleColor = '#0d1110';
                }

                return (
                  <div
                    key={step.title}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.85rem',
                      padding: '0.8rem 1rem',
                      borderRadius: '12px',
                      background: isCurrent ? '#f9fbfb' : 'transparent',
                      border: isCurrent ? '1.5px solid rgba(111, 175, 154, 0.45)' : '1.5px solid transparent',
                      boxShadow: isCurrent ? '0 2px 8px rgba(13, 17, 16, 0.05)' : 'none',
                      transition: 'all 0.3s ease',
                    }}
                  >
                    <div
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        background: circleBg,
                        color: iconColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        flexShrink: 0,
                        marginTop: '0.1rem',
                        transition: 'all 0.3s ease',
                      }}
                    >
                      {isDone ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : isCurrent ? (
                        <div
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: '#ffffff',
                            animation: 'pulse 1.2s infinite',
                          }}
                        />
                      ) : (
                        <span>{idx + 1}</span>
                      )}
                    </div>

                    <div style={{ flex: 1 }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: '0.88rem',
                          fontWeight: isCurrent ? 700 : 600,
                          color: titleColor,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.45rem',
                        }}
                      >
                        {step.title}
                        {isCurrent && (
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 500,
                              color: '#3e8b75',
                              background: 'rgba(111, 175, 154, 0.16)',
                              padding: '0.1rem 0.45rem',
                              borderRadius: '6px',
                            }}
                          >
                            In progress
                          </span>
                        )}
                        {isDone && (
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 500,
                              color: '#15803d',
                              background: 'rgba(34, 197, 94, 0.12)',
                              padding: '0.1rem 0.45rem',
                              borderRadius: '6px',
                            }}
                          >
                            Done
                          </span>
                        )}
                      </p>
                      <p
                        style={{
                          margin: '0.2rem 0 0',
                          fontSize: '0.78rem',
                          color: isCurrent ? '#4b5563' : '#9ca3af',
                          lineHeight: '1.45',
                        }}
                      >
                        {step.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <p style={{ margin: 0, fontSize: '0.78rem', color: '#688279', textAlign: 'center' }}>
              Your test will open automatically as soon as question generation completes.
            </p>
          </section>
        </main>
      </div>
    );
  }

  if (error && questions.length === 0) {
    return (
      <div className="dash-page">
        <main className="dash-container">
          <section className="dash-card">
            <h1 className="dash-greeting__title">{title}</h1>
            <div className="dash-alert" role="alert" style={{ marginTop: '1rem' }}>
              {error}
            </div>
            <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.65rem' }}>
              <Link href={`/session/${sessionId}/details`} className="dash-btn dash-btn--sm">
                Session Details
              </Link>
              <Link href={`/session/${sessionId}/chat`} className="dash-btn dash-btn--sm">
                Back to chat
              </Link>
            </div>
          </section>
        </main>
      </div>
    );
  }

  if (result) {
    const score = result.score;
    const isPassing = score.overall_percentage >= 50;

    return (
      <div className="dash-page">
        <main className="dash-container">
          {/* Header Card */}
          <section className="dash-card">
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
              <div>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.28rem 0.75rem',
                    borderRadius: '999px',
                    background: '#eff8f3',
                    border: '1px solid rgba(111, 175, 154, 0.4)',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    color: '#3e8b75',
                    marginBottom: '0.5rem',
                  }}
                >
                  Assessment Complete
                </div>
                <h1 className="dash-greeting__title">{title} Results</h1>
                <p className="dash-greeting__text">
                  You scored {score.correct_count} out of {score.total_questions} questions correctly.
                </p>
              </div>

              <div
                style={{
                  padding: '1rem 1.5rem',
                  borderRadius: '16px',
                  background: isPassing ? '#eff8f3' : '#fdf3f2',
                  border: `1px solid ${isPassing ? 'rgba(111, 175, 154, 0.45)' : 'rgba(180, 68, 60, 0.35)'}`,
                  textAlign: 'center',
                  minWidth: '130px',
                }}
              >
                <span style={{ fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: isPassing ? '#3e8b75' : '#b4443c' }}>
                  Overall Score
                </span>
                <p style={{ margin: '0.2rem 0 0', fontSize: '2rem', fontWeight: 800, color: isPassing ? '#2b7a63' : '#b4443c' }}>
                  {score.overall_percentage}%
                </p>
              </div>
            </div>
          </section>

          {/* Question Breakdown */}
          <section className="dash-card">
            <h2 className="dash-card__title">Question Review & Explanations</h2>
            <ul style={{ listStyle: 'none', margin: '1rem 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {score.per_question.map((row, i) => {
                const question = questions.find((q) => q.id === row.question_id);
                const isMulti = question?.is_multiple || Array.isArray(row.choice);
                
                let chosenText = 'No answer provided';
                if (isMulti && Array.isArray(row.choice)) {
                  chosenText = row.choice.map((c: number) => question?.options[c]).filter(Boolean).join(', ');
                } else if (typeof row.choice === 'number') {
                  chosenText = question?.options[row.choice] ?? 'No answer provided';
                }

                let correctText = '';
                const correctIndices: number[] = (row as any).correct_indices || (question?.correct_index !== undefined ? [question.correct_index] : [row.correct_index]);
                if (isMulti && correctIndices.length > 0) {
                  correctText = correctIndices.map((ci: number) => question?.options[ci]).filter(Boolean).join(', ');
                } else {
                  correctText = question?.options[row.correct_index] ?? '—';
                }

                return (
                  <li
                    key={row.question_id}
                    style={{
                      padding: '1.15rem 1.25rem',
                      borderRadius: '16px',
                      background: row.correct ? '#eff8f3' : '#fdf3f2',
                      border: `1px solid ${row.correct ? 'rgba(111, 175, 154, 0.35)' : 'rgba(180, 68, 60, 0.3)'}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.45rem' }}>
                      <span
                        style={{
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          color: row.correct ? '#2b7a63' : '#b4443c',
                        }}
                      >
                        {row.correct ? '✓ Correct' : '✕ Incorrect'}
                      </span>
                      {row.concept && (
                        <span style={{ fontSize: '0.76rem', color: 'var(--d-muted)', fontWeight: 500 }}>
                          Concept: {row.concept}
                        </span>
                      )}
                    </div>

                    <p style={{ margin: '0 0 0.5rem', fontWeight: 700, fontSize: '0.96rem', color: '#0d1110', lineHeight: 1.45 }}>
                      {i + 1}. {row.question}
                    </p>

                    <p style={{ margin: '0 0 0.25rem', fontSize: '0.88rem', color: 'var(--d-muted)' }}>
                      <strong>Your answer: </strong>
                      <span style={{ color: row.correct ? '#2b7a63' : '#b4443c', fontWeight: 600 }}>
                        {chosenText}
                      </span>
                    </p>

                    {!row.correct && (
                      <p style={{ margin: '0 0 0.45rem', fontSize: '0.88rem', color: '#2b7a63' }}>
                        <strong>Correct answer: </strong>
                        <span style={{ fontWeight: 600 }}>{correctText}</span>
                      </p>
                    )}

                    {row.explanation && (
                      <blockquote
                        style={{
                          margin: '0.65rem 0 0',
                          paddingLeft: '0.85rem',
                          borderLeft: `3px solid ${row.correct ? '#6faf9a' : '#e06a60'}`,
                          fontStyle: 'italic',
                          fontSize: '0.82rem',
                          color: 'var(--d-muted)',
                          lineHeight: 1.5,
                        }}
                      >
                        {row.explanation}
                      </blockquote>
                    )}
                  </li>
                );
              })}
            </ul>

            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="dash-btn"
                onClick={() => router.push(afterSubmitPath)}
              >
                {form === 'pre' ? 'Continue to Study Guide →' : 'View Learning Report →'}
              </button>
              <Link
                href={`/session/${sessionId}/details`}
                className="dash-btn dash-btn--sm"
                style={{ background: '#ffffff', color: '#0d1110' }}
              >
                Session Details
              </Link>
            </div>
          </section>
        </main>
      </div>
    );
  }

  if (!current) return null;

  const progress = ((index + 1) / questions.length) * 100;

  return (
    <div className="dash-page">
      <main className="dash-container">
        {/* Header Section */}
        <section className="dash-card">
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.28rem 0.75rem',
                  borderRadius: '999px',
                  background: '#eff8f3',
                  border: '1px solid rgba(111, 175, 154, 0.4)',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  color: '#3e8b75',
                  marginBottom: '0.5rem',
                }}
              >
                Knowledge Assessment
              </div>
              <h1 className="dash-greeting__title">{title}</h1>
              <p className="dash-greeting__text">{subtitle}</p>
            </div>

            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <Link href={`/session/${sessionId}/details`} className="dash-btn dash-btn--sm">
                Details
              </Link>
              <Link href="/dashboard" className="dash-btn dash-btn--sm">
                Dashboard
              </Link>
            </div>
          </div>
        </section>

        {/* Question Card */}
        <section className="dash-card">
          {/* Progress Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--d-cyan)' }}>
              Question {index + 1} of {questions.length}
            </span>
            <span style={{ fontSize: '0.82rem', color: 'var(--d-muted)', fontWeight: 600 }}>
              {Math.round(progress)}% Completed
            </span>
          </div>

          {/* Progress Bar Track */}
          <div
            style={{
              height: '8px',
              width: '100%',
              borderRadius: '999px',
              background: 'rgba(111, 175, 154, 0.2)',
              overflow: 'hidden',
              marginBottom: '1.75rem',
            }}
          >
            <div
              style={{
                height: '100%',
                borderRadius: '999px',
                background: 'linear-gradient(90deg, #6faf9a 0%, #3e8b75 100%)',
                width: `${progress}%`,
                transition: 'width 0.3s ease',
              }}
            />
          </div>

          {/* Concept Chip & Question Text */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
              {current.concept && (
                <span
                  style={{
                    display: 'inline-block',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: '#3e8b75',
                  }}
                >
                  Concept: {current.concept}
                </span>
              )}
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  padding: '0.15rem 0.5rem',
                  borderRadius: '6px',
                  background: current.is_multiple ? 'rgba(59, 130, 246, 0.12)' : 'rgba(111, 175, 154, 0.15)',
                  color: current.is_multiple ? '#1d4ed8' : '#2e7d67',
                }}
              >
                {current.is_multiple ? 'Multiple Answers (Select all that apply)' : 'Single Answer'}
              </span>
            </div>

            <h2
              style={{
                fontSize: '1.18rem',
                fontWeight: 700,
                color: '#0d1110',
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              {current.question}
            </h2>
          </div>

          {/* Answer Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {current.options.map((option, optionIndex) => {
              const selected = current.is_multiple
                ? Array.isArray(answers[current.id]) && (answers[current.id] as number[]).includes(optionIndex)
                : answers[current.id] === optionIndex;

              return (
                <button
                  key={optionIndex}
                  type="button"
                  onClick={() => toggleOption(optionIndex)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.85rem',
                    padding: '1rem 1.15rem',
                    borderRadius: '14px',
                    border: `1.5px solid ${selected ? '#3e8b75' : 'rgba(111, 175, 154, 0.3)'}`,
                    background: selected ? '#eff8f3' : '#ffffff',
                    textAlign: 'left',
                    fontSize: '0.92rem',
                    color: selected ? '#0d1110' : '#2b3631',
                    cursor: 'pointer',
                    boxShadow: selected ? '0 3px 12px rgba(62, 139, 117, 0.15)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '1.65rem',
                      height: '1.65rem',
                      borderRadius: current.is_multiple ? '6px' : '50%',
                      background: selected ? '#3e8b75' : '#eff8f3',
                      color: selected ? '#ffffff' : '#3e8b75',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      flexShrink: 0,
                      marginTop: '0.1rem',
                      border: selected ? 'none' : '1px solid rgba(111, 175, 154, 0.4)',
                    }}
                  >
                    {current.is_multiple && selected ? '✓' : String.fromCharCode(65 + optionIndex)}
                  </span>
                  <span style={{ lineHeight: 1.5, fontWeight: selected ? 600 : 400 }}>
                    {option}
                  </span>
                </button>
              );
            })}
          </div>

          {error && (
            <div className="dash-alert" role="alert" style={{ marginTop: '1.25rem' }}>
              {error}
            </div>
          )}

          {/* Navigation Controls */}
          <div
            style={{
              marginTop: '1.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap',
            }}
          >
            <button
              type="button"
              className="dash-btn"
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index === 0 || submitting}
              style={{
                opacity: index === 0 ? 0.45 : 1,
                cursor: index === 0 ? 'not-allowed' : 'pointer',
                background: '#ffffff',
                color: '#0d1110',
              }}
            >
              ← Previous
            </button>

            {index < questions.length - 1 ? (
              <button
                type="button"
                className="dash-btn"
                onClick={() => setIndex((i) => i + 1)}
                disabled={!answered}
                style={{
                  opacity: !answered ? 0.45 : 1,
                  cursor: !answered ? 'not-allowed' : 'pointer',
                }}
              >
                Next Question →
              </button>
            ) : (
              <button
                type="button"
                className="dash-btn"
                onClick={submit}
                disabled={!allAnswered || submitting}
                style={{
                  opacity: !allAnswered || submitting ? 0.45 : 1,
                  cursor: !allAnswered || submitting ? 'not-allowed' : 'pointer',
                }}
              >
                {submitting ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="dash-spinner" style={{ width: '1rem', height: '1rem' }} /> Submitting…
                  </span>
                ) : (
                  'Submit Assessment ✓'
                )}
              </button>
            )}
          </div>

          {!allAnswered && (
            <p style={{ margin: '0.85rem 0 0', fontSize: '0.8rem', color: 'var(--d-muted)', textAlign: 'right' }}>
              Please select an answer for every question before submitting.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}

