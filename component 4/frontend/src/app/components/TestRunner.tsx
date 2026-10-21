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
  const [answers, setAnswers] = useState<Record<string, number>>({});
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
  const answered = current ? answers[current.id] !== undefined : false;
  const allAnswered = questions.length > 0 && questions.every((q) => answers[q.id] !== undefined);

  const submit = async () => {
    if (submitting || !allAnswered) return;
    setSubmitting(true);
    setError('');

    const payload = {
      answers: questions.map((q) => ({ question_id: q.id, choice: answers[q.id] })),
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

  if (loading) {
    return (
      <div className="dash-page">
        <main className="dash-container">
          <section
            className="dash-card"
            style={{
              padding: '3.5rem 1.5rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1.25rem',
            }}
          >
            <span
              className="dash-spinner"
              style={{ width: '2.5rem', height: '2.5rem', borderWidth: '3.5px' }}
              aria-hidden="true"
            />
            <div>
              <h1 className="dash-greeting__title" style={{ fontSize: '1.25rem' }}>
                Preparing your {title}…
              </h1>
              <p className="dash-greeting__text">
                Generating questions for your session concepts. This may take a few moments.
              </p>
            </div>
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
                const chosen = row.choice === null ? null : question?.options[row.choice];
                const correct = question?.options[row.correct_index];

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
                        {chosen ?? 'No answer provided'}
                      </span>
                    </p>

                    {!row.correct && (
                      <p style={{ margin: '0 0 0.45rem', fontSize: '0.88rem', color: '#2b7a63' }}>
                        <strong>Correct answer: </strong>
                        <span style={{ fontWeight: 600 }}>{correct ?? '—'}</span>
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
            {current.concept && (
              <span
                style={{
                  display: 'inline-block',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: '#3e8b75',
                  marginBottom: '0.4rem',
                }}
              >
                Concept: {current.concept}
              </span>
            )}
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
              const selected = answers[current.id] === optionIndex;
              return (
                <button
                  key={optionIndex}
                  type="button"
                  onClick={() =>
                    setAnswers((prev) => ({ ...prev, [current.id]: optionIndex }))
                  }
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
                      borderRadius: '50%',
                      background: selected ? '#3e8b75' : '#eff8f3',
                      color: selected ? '#ffffff' : '#3e8b75',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      flexShrink: 0,
                      marginTop: '0.1rem',
                      border: selected ? 'none' : '1px solid rgba(111, 175, 154, 0.4)',
                    }}
                  >
                    {String.fromCharCode(65 + optionIndex)}
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

