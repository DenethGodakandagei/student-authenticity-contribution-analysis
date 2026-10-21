// app/session/[id]/exam/page.tsx
'use client';

import { use, useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  apiRequest,
  getAccessToken,
  getServerAuthSnapshot,
  subscribeAuth,
} from '../../../utils/api';
import type { ApiError, ExamQuestionResult, ExamResponse, SessionState } from '../../../utils/types';
import '../chat/teachingWorkspace.css';

function ResultList({
  title,
  items,
  type,
}: {
  title: string;
  items: ExamQuestionResult[];
  type: 'correct' | 'incorrect';
}) {
  const isCorrect = type === 'correct';

  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.65rem' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: isCorrect ? '#eff8f3' : '#fdf2f2',
            color: isCorrect ? '#2b7a63' : '#b4443c',
            border: `1px solid ${isCorrect ? 'rgba(43, 122, 99, 0.3)' : 'rgba(180, 68, 60, 0.3)'}`,
            fontSize: '0.75rem',
            fontWeight: 800,
          }}
        >
          {isCorrect ? '✓' : '✕'}
        </span>
        <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: isCorrect ? '#2b7a63' : '#b4443c' }}>
          {title} ({items.length})
        </h4>
      </div>

      {items.length === 0 ? (
        <p style={{ margin: 0, fontSize: '0.85rem', color: '#8a9a93', fontStyle: 'italic', paddingLeft: '1.75rem' }}>
          None.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', paddingLeft: '0.5rem' }}>
          {items.map((item, index) => (
            <div
              key={`${title}-${index}`}
              style={{
                background: '#ffffff',
                border: `1.5px solid ${isCorrect ? 'rgba(111, 175, 154, 0.35)' : 'rgba(180, 68, 60, 0.25)'}`,
                borderRadius: '16px',
                padding: '1rem 1.25rem',
                boxShadow: '0 4px 12px rgba(13, 17, 16, 0.04)',
              }}
            >
              <p style={{ margin: '0 0 0.5rem', fontSize: '0.92rem', fontWeight: 600, color: '#0d1110' }}>
                {item.question}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.8rem' }}>
                <span style={{ color: isCorrect ? '#2b7a63' : '#b4443c', fontWeight: 600 }}>
                  Nova answered: {String(item.nova_answer)}
                </span>
                <span style={{ color: '#52615b' }}>
                  Expected: {String(item.expected_answer)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ExamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = use(params);
  const router = useRouter();
  const token = useSyncExternalStore(subscribeAuth, getAccessToken, getServerAuthSnapshot);

  const [session, setSession] = useState<SessionState | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ExamResponse | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      router.replace('/login');
      return;
    }

    // Fetch session details for title and misconceptions
    apiRequest<SessionState>(`/sessions/${sessionId}`, 'GET').then((res) => {
      if (res.ok && res.data) {
        setSession(res.data);
      }
    });
  }, [token, router, sessionId]);

  const runExam = async () => {
    if (running) return;
    setRunning(true);
    setError('');
    setResult(null);

    const res = await apiRequest<ExamResponse & ApiError>(
      `/sessions/${sessionId}/exam`,
      'POST'
    );
    setRunning(false);

    if (res.ok && res.data?.session_id) {
      setResult(res.data);
      return;
    }
    setError(res.data?.detail ?? res.error ?? 'The assessment exam could not run.');
  };

  if (!token) {
    return (
      <main className="dash-loading">
        <span className="dash-spinner" aria-hidden="true" />
      </main>
    );
  }

  const topicTitle = session?.topic || (session as unknown as { session_title?: string })?.session_title || 'Java Programming Notes';

  return (
    <div className="teaching-workspace" style={{ marginTop: '5rem' }}>
      {/* Top Header bar matching Chat view */}
      <div className="teaching-topbar">
        <div className="teaching-topbar__left">
          <button
            type="button"
            onClick={() => router.push(`/session/${sessionId}/chat`)}
            className="teaching-back-btn"
            title="Back to Teaching Chat"
            aria-label="Back"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <div>
            <h1 className="teaching-topbar__title">{topicTitle}</h1>
          </div>
        </div>

        <div className="teaching-topbar__right">
          <Link
            href={`/session/${sessionId}/chat`}
            className="teaching-topbar-action-btn"
            style={{ textDecoration: 'none' }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            TEACHING CHAT
          </Link>

          
        </div>
      </div>

      {/* Main Two-Card Layout matching teachingWorkspace.css */}
      <div className="teaching-grid">
        {/* ===================================================================
            CARD 1: Exam Control & Instructions
           =================================================================== */}
        <section className="thought-canvas" style={{ minHeight: '620px', height: 'auto' }}>
          <div className="thought-canvas__topbar">
            <div className="thought-canvas__headline">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <span>Assessment Overview</span>
            </div>
          </div>

          {/* Interactive Exam Information Card */}
          <div className="thought-card" style={{ margin: '1.5rem 0', minHeight: 'auto', flex: 1 }}>
            <div className="thought-card__header">
              <div className="thought-card__author">
                <div>
                  <h3 className="thought-card__title" style={{ fontSize: '1.15rem' }}>
                    Nova Exam Evaluation
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: '#52615b' }}>
                    AI Student Knowledge Testing
                  </span>
                </div>
              </div>

              <span
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  padding: '0.3rem 0.8rem',
                  borderRadius: '999px',
                  background: '#eff8f3',
                  border: '1px solid rgba(111, 175, 154, 0.4)',
                  color: '#3e8b75',
                }}
              >
                {session?.misconceptions?.length || 0} Topics Checked
              </span>
            </div>

            <div className="thought-card__body" style={{ margin: '1.25rem 0', flexDirection: 'column', alignItems: 'flex-start', gap: '0.85rem' }}>
              <p className="thought-card__quote" style={{ fontSize: '0.98rem' }}>
                This exam tests whether your teaching successfully corrected Nova&apos;s misconceptions. Questions generated from lecture concepts evaluate Nova&apos;s answers against expected truths.
              </p>

              <div
                style={{
                  width: '100%',
                  background: '#f7fcf9',
                  border: '1px solid rgba(111, 175, 154, 0.25)',
                  borderRadius: '14px',
                  padding: '1rem',
                  fontSize: '0.84rem',
                  color: '#52615b',
                  lineHeight: 1.6,
                }}
              >
                <strong>Evaluation Workflow:</strong>
                <ul style={{ margin: '0.4rem 0 0', paddingLeft: '1.25rem' }}>
                  <li>Generates conceptual MCQs for each active misconception.</li>
                  <li>Queries Nova to choose an answer using her current belief state.</li>
                  <li>Calculates accuracy, remaining misconceptions, and mastery score.</li>
                </ul>
              </div>

              {error && (
                <div
                  style={{
                    width: '100%',
                    background: '#fdf2f2',
                    border: '1px solid rgba(180, 68, 60, 0.3)',
                    borderRadius: '12px',
                    padding: '0.75rem 1rem',
                    color: '#b4443c',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                  }}
                  role="alert"
                >
                  {error}
                </div>
              )}
            </div>

            <div className="thought-card__footer" style={{ borderTop: '1px solid rgba(111, 175, 154, 0.2)', paddingTop: '1rem' }}>
              <button
                type="button"
                className="teaching-mark-btn"
                onClick={runExam}
                disabled={running}
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  padding: '0.75rem 1.5rem',
                  fontSize: '0.95rem',
                }}
              >
                {running ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="dash-spinner" style={{ width: '1rem', height: '1rem' }} />
                    Evaluating Nova&apos;s Answers…
                  </span>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    {result ? 'Retake Assessment Exam' : 'Run Assessment Exam'}
                  </>
                )}
              </button>
            </div>
          </div>

          <p className="thought-canvas__footer-text">
            Assess Nova. Measure understanding.
          </p>
        </section>

        {/* ===================================================================
            CARD 2: Exam Results & Misconceptions Breakdown
           =================================================================== */}
        <section className="teaching-chatbox" style={{ minHeight: '620px', height: 'auto' }}>
          {/* Header */}
          <div className="teaching-chatbox__header">
            
            <div>
              <h3 className="teaching-chatbox__name">Exam Results</h3>
              <p className="teaching-chatbox__status">
                {result ? `${result.score}% Mastery Score` : 'No exam completed yet'}
              </p>
            </div>
          </div>

          {/* Transcript / Result Area */}
          <div className="teaching-transcript-area" style={{ flex: 1, padding: '1.75rem' }}>
            {!result ? (
              <div
                style={{
                  height: '100%',
                  minHeight: '340px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  color: '#8a9a93',
                  padding: '2rem',
                }}
              >
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: '#eff8f3',
                    border: '1.5px solid rgba(111, 175, 154, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.75rem',
                    marginBottom: '1rem',
                  }}
                >
                  N
                </div>
                <h4 style={{ margin: '0 0 0.5rem', color: '#0d1110', fontSize: '1.1rem', fontWeight: 700 }}>
                  Ready to test Nova
                </h4>
                <p style={{ margin: 0, fontSize: '0.88rem', maxWidth: '340px', lineHeight: 1.55 }}>
                  Click &ldquo;Run Assessment Exam&rdquo; on the left to evaluate Nova&apos;s current knowledge on {topicTitle}.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Score Pill Card */}
                <div
                  style={{
                    background: '#f7fcf9',
                    border: '1.5px solid rgba(111, 175, 154, 0.35)',
                    borderRadius: '18px',
                    padding: '1.25rem 1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.78rem', color: '#52615b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Overall Exam Score
                    </span>
                    <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#3e8b75', marginTop: '0.2rem' }}>
                      {result.score}%
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0d1110' }}>
                      {result.correct_answers.length} of {result.total_questions} Correct
                    </span>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.76rem', color: '#52615b' }}>
                      {result.remaining_misconceptions.length} remaining misconceptions
                    </p>
                  </div>
                </div>

                {/* Correct Answers */}
                <ResultList
                  title="Correct Answers"
                  items={result.correct_answers}
                  type="correct"
                />

                {/* Incorrect Answers */}
                <ResultList
                  title="Incorrect Answers"
                  items={result.incorrect_answers}
                  type="incorrect"
                />

                {/* Remaining Misconceptions */}
                <div>
                  <h4 style={{ margin: '0 0 0.65rem', fontSize: '0.92rem', fontWeight: 700, color: '#0d1110' }}>
                    Remaining Misconceptions ({result.remaining_misconceptions.length})
                  </h4>
                  {result.remaining_misconceptions.length === 0 ? (
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#2b7a63', fontStyle: 'italic', fontWeight: 600 }}>
                      🎉 Awesome! Nova has resolved all misconceptions on this topic.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                      {result.remaining_misconceptions.map((item) => (
                        <div
                          key={item.id}
                          style={{
                            background: '#ffffff',
                            border: '1.5px solid rgba(111, 175, 154, 0.28)',
                            borderRadius: '14px',
                            padding: '0.85rem 1.15rem',
                            boxShadow: '0 2px 6px rgba(13, 17, 16, 0.04)',
                          }}
                        >
                          <span
                            style={{
                              display: 'inline-block',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              color: '#3e8b75',
                              marginBottom: '0.25rem',
                            }}
                          >
                            {item.concept || 'General'}
                          </span>
                          <p style={{ margin: 0, fontSize: '0.86rem', color: '#0d1110', fontWeight: 500 }}>
                            {item.wrong_concept}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Action Footer */}
          <div className="teaching-chatbox__bottom">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <Link
                href={`/session/${sessionId}/chat`}
                className="teaching-mark-btn"
                style={{ textDecoration: 'none', padding: '0.55rem 1.4rem' }}
              >
                ← Back to Teaching Chat
              </Link>

              <Link
                href={`/session/${sessionId}/posttest`}
                className="teaching-topbar-action-btn"
                style={{ textDecoration: 'none' }}
              >
                Post-Test Diagnostic →
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
