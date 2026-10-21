// app/session/[id]/summery/page.tsx
'use client';

import { use, useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import {
  apiRequest,
  getAccessToken,
  getServerAuthSnapshot,
  subscribeAuth,
} from '../../../utils/api';
import { useRoleGuard } from '../../../utils/useRoleGuard';
import type {
  ApiError,
  LearningEvaluation,
  SessionState,
  UnderstandingSummary,
} from '../../../utils/types';
import '../../../components/dashboard/dashboard.css';
import '../details/details.css';

interface StudyGuideData {
  topic?: string;
  overview?: string;
  sections?: Array<{
    concept: string;
    explanation: string;
    analogy?: string;
    example?: string;
    key_points?: string[];
    source_pages?: number[];
  }>;
  teaching_tips?: string[];
}

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
}

function formatScore(val: number | null | undefined): string {
  if (val === null || val === undefined) return 'Not taken';
  return `${Math.round(val)}%`;
}

function statusPillClass(status: string): string {
  switch (status) {
    case 'learned':
      return 'details-status-pill details-status-pill--learned';
    case 'testing':
      return 'details-status-pill details-status-pill--testing';
    case 'needs_review':
      return 'details-status-pill details-status-pill--needs_review';
    default:
      return 'details-status-pill details-status-pill--active';
  }
}

export default function SessionSummaryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const token = useSyncExternalStore(subscribeAuth, getAccessToken, getServerAuthSnapshot);
  const { ready } = useRoleGuard('student');
  const { id: sessionId } = use(params);

  const [session, setSession] = useState<SessionState | null>(null);
  const [understanding, setUnderstanding] = useState<UnderstandingSummary | null>(null);
  const [evaluation, setEvaluation] = useState<LearningEvaluation | null>(null);
  const [studyGuide, setStudyGuide] = useState<StudyGuideData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token || !sessionId) return;
    let cancelled = false;

    const loadAllDetails = async () => {
      setLoading(true);
      setError('');

      try {
        const [sessionRes, summaryRes, evalRes, guideRes] = await Promise.all([
          apiRequest<SessionState & ApiError>(`/sessions/${sessionId}`, 'GET'),
          apiRequest<UnderstandingSummary & ApiError>(`/sessions/${sessionId}/summary`, 'GET'),
          apiRequest<LearningEvaluation & ApiError>(`/sessions/${sessionId}/evaluation`, 'GET'),
          apiRequest<StudyGuideData & ApiError>(`/sessions/${sessionId}/study-guide`, 'GET'),
        ]);

        if (cancelled) return;
        setLoading(false);

        if (sessionRes.ok && sessionRes.data?.session_id) {
          setSession(sessionRes.data);
        } else {
          setError(
            sessionRes.data?.detail ??
              sessionRes.error ??
              'Could not load session summary information.'
          );
        }

        if (summaryRes.ok && summaryRes.data) {
          setUnderstanding(summaryRes.data);
        }

        if (evalRes.ok && evalRes.data) {
          setEvaluation(evalRes.data);
        }

        if (guideRes.ok && guideRes.data) {
          setStudyGuide(guideRes.data);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setLoading(false);
          setError(err instanceof Error ? err.message : 'Failed to load session details.');
        }
      }
    };

    loadAllDetails();

    return () => {
      cancelled = true;
    };
  }, [sessionId, token]);

  if (!ready || loading) {
    return (
      <main className="dash-loading">
        <span className="dash-spinner" aria-hidden="true" />
      </main>
    );
  }

  if (error || !session) {
    return (
      <div className="details-page dash-page">
        <main className="dash-container">
          <section className="dash-card">
            <h1 className="dash-greeting__title">Session Summary</h1>
            <div className="dash-alert" role="alert" style={{ marginTop: '1rem' }}>
              {error || 'Session not found.'}
            </div>
            <Link href="/dashboard" className="dash-btn" style={{ marginTop: '1rem' }}>
              Back to dashboard
            </Link>
          </section>
        </main>
      </div>
    );
  }

  const misconceptions = session.misconceptions || [];
  const learnedCount = misconceptions.filter((m) => m.status === 'learned' || m.is_corrected).length;
  const activeCount = misconceptions.filter((m) => m.status === 'active').length;
  const testingCount = misconceptions.filter((m) => m.status === 'testing').length;
  const needsReviewCount = misconceptions.filter((m) => m.status === 'needs_review').length;

  const preTestScore =
    session.tests?.pre?.score?.overall_percentage ??
    evaluation?.pre_score ??
    (session.events?.find((e) => e.type === 'pretest_submitted')?.score as number | undefined);

  const postTestScore =
    session.tests?.post?.score?.overall_percentage ??
    evaluation?.post_score ??
    (session.events?.find((e) => e.type === 'posttest_submitted')?.score as number | undefined);

  const history = session.conversation_history || [];
  const events = session.events || [];

  return (
    <div className="details-page dash-page">
      <main className="dash-container">
        {/* Top Header Card */}
        <section className="dash-card">
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
            }}
          >
            <div>
              <div className="details-badge">
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
                Complete Session Summary
              </div>
              <h1 className="dash-greeting__title">{session.topic || 'Nova Teaching Session'}</h1>
              <p className="dash-greeting__text">
                Session ID:{' '}
                <code
                  style={{
                    background: '#eff8f3',
                    padding: '0.15rem 0.45rem',
                    borderRadius: '6px',
                    border: '1px solid rgba(111,175,154,0.3)',
                    color: '#0d1110',
                    fontSize: '0.86rem',
                  }}
                >
                  {session.session_id}
                </code>
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              <Link href={`/session/${session.session_id}/chat`} className="dash-btn dash-btn--primary dash-btn--sm">
                Open Chat
              </Link>
              <Link href="/dashboard" className="dash-btn dash-btn--sm">
                Dashboard
              </Link>
            </div>
          </div>
        </section>

        {/* Quick Navigation Bar */}
        <nav className="details-nav">
          <Link href={`/session/${session.session_id}/chat`} className="details-nav-btn details-nav-btn--primary">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
            </svg>
            Teaching Chat
          </Link>
          <Link href={`/session/${session.session_id}/study`} className="details-nav-btn">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
            Study Guide
          </Link>
          <Link href={`/session/${session.session_id}/pretest`} className="details-nav-btn">
            Pre-test
          </Link>
          <Link href={`/session/${session.session_id}/posttest`} className="details-nav-btn">
            Post-test
          </Link>
          <Link href={`/session/${session.session_id}/report`} className="details-nav-btn">
            Detailed Report
          </Link>
        </nav>

        {/* Metric Overview Cards */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '1rem',
          }}
        >
          <div className="details-stat-box">
            <span className="details-stat-box__label">Learned Misconceptions</span>
            <span className="details-stat-box__val" style={{ color: '#2b7a63' }}>
              {learnedCount} / {misconceptions.length}
            </span>
            <span style={{ fontSize: '0.78rem', color: '#52615b' }}>
              {misconceptions.length > 0 ? Math.round((learnedCount / misconceptions.length) * 100) : 0}% mastered
            </span>
          </div>

          <div className="details-stat-box">
            <span className="details-stat-box__label">Pre-test Score</span>
            <span className="details-stat-box__val">{formatScore(preTestScore)}</span>
            <span style={{ fontSize: '0.78rem', color: '#52615b' }}>
              {session.tests?.pre?.submitted_at ? formatDate(session.tests.pre.submitted_at) : 'Diagnostic test'}
            </span>
          </div>

          <div className="details-stat-box">
            <span className="details-stat-box__label">Post-test Score</span>
            <span className="details-stat-box__val">{formatScore(postTestScore)}</span>
            <span style={{ fontSize: '0.78rem', color: '#52615b' }}>
              {evaluation?.normalized_gain !== null && evaluation?.normalized_gain !== undefined
                ? `Normalized Gain: +${Math.round(evaluation.normalized_gain * 100)}%`
                : 'Follow-up assessment'}
            </span>
          </div>

          <div className="details-stat-box">
            <span className="details-stat-box__label">Student & Level</span>
            <span className="details-stat-box__val" style={{ fontSize: '1.2rem' }}>
              {session.name || 'Nova'} ({session.level || 'Beginner'})
            </span>
            <span style={{ fontSize: '0.78rem', color: '#52615b' }}>
              {history.length} dialogue messages
            </span>
          </div>
        </section>

        {/* Learning Objectives */}
        {session.learning_objectives && session.learning_objectives.length > 0 && (
          <section className="dash-card">
            <h2 className="dash-section-title" style={{ marginBottom: '0.75rem' }}>
              Learning Objectives
            </h2>
            <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.45rem', color: '#52615b', fontSize: '0.92rem' }}>
              {session.learning_objectives.map((obj, i) => (
                <li key={i} style={{ lineHeight: '1.5' }}>
                  <strong style={{ color: '#0d1110' }}>{obj}</strong>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Misconceptions Detailed Table / Grid */}
        <section className="dash-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h2 className="dash-section-title" style={{ margin: 0 }}>
                Misconceptions & Teaching Status
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#52615b', marginTop: '0.2rem' }}>
                Active: {activeCount} | Testing: {testingCount} | Needs Review: {needsReviewCount} | Learned: {learnedCount}
              </p>
            </div>
            {understanding?.overall_score !== null && understanding?.overall_score !== undefined && (
              <span className="details-badge" style={{ margin: 0 }}>
                Overall Understanding: {Math.round(understanding.overall_score * 100)}%
              </span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {misconceptions.map((m) => (
              <div key={m.id} className="details-item-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.8rem', flexWrap: 'wrap' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#3e8b75', letterSpacing: '0.04em' }}>
                      {m.concept || session.topic || 'Concept'}
                    </span>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0.2rem 0 0.4rem', color: '#0d1110' }}>
                      {m.wrong_concept}
                    </h3>
                  </div>
                  <span className={statusPillClass(m.status)}>{m.status}</span>
                </div>

                <div style={{ marginTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.87rem' }}>
                  <div style={{ color: '#2b7a63' }}>
                    <strong>Accurate Concept: </strong> {m.correct_concept}
                  </div>
                  {m.reason && (
                    <div style={{ color: '#52615b' }}>
                      <strong>Pedagogical Reason: </strong> {m.reason}
                    </div>
                  )}
                  {m.user_explanation && (
                    <div style={{ marginTop: '0.3rem', padding: '0.5rem 0.75rem', background: '#ffffff', borderRadius: '8px', border: '1px solid rgba(111,175,154,0.3)', color: '#0d1110' }}>
                      <strong>Accepted Explanation: </strong> “{m.user_explanation}”
                    </div>
                  )}
                  {m.source_pages && m.source_pages.length > 0 && (
                    <div style={{ fontSize: '0.78rem', color: '#8a9a93', marginTop: '0.2rem' }}>
                      Lecture Pages: {m.source_pages.join(', ')}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Study Guide Summary / Preview */}
        {studyGuide && studyGuide.sections && studyGuide.sections.length > 0 && (
          <section className="dash-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
              <h2 className="dash-section-title" style={{ margin: 0 }}>
                Study Guide Core Concepts
              </h2>
              <Link href={`/session/${session.session_id}/study`} className="dash-btn dash-btn--sm">
                View Full Guide
              </Link>
            </div>
            {studyGuide.overview && (
              <p style={{ fontSize: '0.88rem', color: '#52615b', marginBottom: '1rem', lineHeight: '1.5' }}>
                {studyGuide.overview}
              </p>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.85rem' }}>
              {studyGuide.sections.map((sec, idx) => (
                <div key={idx} className="details-item-card" style={{ background: '#ffffff' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#3e8b75', marginBottom: '0.35rem' }}>
                    {sec.concept}
                  </h4>
                  <p style={{ fontSize: '0.85rem', color: '#52615b', marginBottom: '0.45rem', lineHeight: '1.45' }}>
                    {sec.explanation}
                  </p>
                  {sec.analogy && (
                    <div style={{ fontSize: '0.8rem', color: '#0d1110', fontStyle: 'italic', marginBottom: '0.45rem' }}>
                      💡 {sec.analogy}
                    </div>
                  )}
                  {sec.key_points && sec.key_points.length > 0 && (
                    <ul style={{ paddingLeft: '1.1rem', margin: 0, fontSize: '0.78rem', color: '#52615b' }}>
                      {sec.key_points.map((kp, kIdx) => (
                        <li key={kIdx}>{kp}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Teaching Conversation History */}
        <section className="dash-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
            <h2 className="dash-section-title" style={{ margin: 0 }}>
              Recent Dialogue History ({history.length} Messages)
            </h2>
            <Link href={`/session/${session.session_id}/chat`} className="dash-btn dash-btn--sm">
              Continue Teaching
            </Link>
          </div>

          {history.length === 0 ? (
            <p style={{ fontSize: '0.88rem', color: '#52615b', fontStyle: 'italic' }}>
              No messages exchanged yet. Click “Continue Teaching” to start conversing with Nova.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '420px', overflowY: 'auto', paddingRight: '0.4rem' }}>
              {history.slice(-10).map((msg, idx) => {
                const isStudent = msg.role === 'user';
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignSelf: isStudent ? 'flex-end' : 'flex-start',
                      maxWidth: '85%',
                      padding: '0.65rem 0.95rem',
                      borderRadius: '14px',
                      background: isStudent ? '#6faf9a' : '#eff8f3',
                      color: isStudent ? '#ffffff' : '#0d1110',
                      border: isStudent ? 'none' : '1px solid rgba(111,175,154,0.25)',
                      fontSize: '0.88rem',
                      lineHeight: '1.45',
                    }}
                  >
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, marginBottom: '0.2rem', opacity: 0.85 }}>
                      {isStudent ? 'You (Tutor)' : 'Nova (Student)'}
                    </span>
                    <div>{msg.content}</div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Timeline of Events */}
        {events.length > 0 && (
          <section className="dash-card">
            <h2 className="dash-section-title" style={{ marginBottom: '0.75rem' }}>
              Activity Timeline
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {events.slice(-8).reverse().map((ev, i) => (
                <div key={i} className="details-event-row">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, textTransform: 'capitalize', color: '#0d1110' }}>
                      {ev.type?.replace(/_/g, ' ') || 'Event'}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#8a9a93' }}>
                      {formatDate(ev.time || ev.timestamp)}
                    </span>
                  </div>
                  {ev.score !== undefined && (
                    <span style={{ color: '#2b7a63', fontWeight: 600 }}>Score: {ev.score}%</span>
                  )}
                  {ev.level !== undefined && (
                    <span style={{ color: '#3e8b75' }}>Hint Level: {ev.level}</span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
