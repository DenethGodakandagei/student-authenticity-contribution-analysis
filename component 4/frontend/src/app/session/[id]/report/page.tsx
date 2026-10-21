// app/session/[id]/report/page.tsx
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
} from '../../../utils/types';
import '../../../components/dashboard/dashboard.css';
import '../details/details.css';

function formatScore(val: number | null | undefined): string {
  if (val === null || val === undefined) return 'Not taken';
  return `${Math.round(val)}%`;
}

function formatDate(val?: string | null): string {
  if (!val) return '—';
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const token = useSyncExternalStore(subscribeAuth, getAccessToken, getServerAuthSnapshot);
  const { ready } = useRoleGuard('student');
  const { id: sessionId } = use(params);

  const [session, setSession] = useState<SessionState | null>(null);
  const [evaluation, setEvaluation] = useState<LearningEvaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token || !sessionId) return;
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      setError('');
      try {
        const [sessionRes, evalRes] = await Promise.all([
          apiRequest<SessionState & ApiError>(`/sessions/${sessionId}`, 'GET'),
          apiRequest<LearningEvaluation & ApiError>(
            `/sessions/${sessionId}/evaluation`,
            'GET'
          ),
        ]);

        if (cancelled) return;
        setLoading(false);

        if (sessionRes.ok && sessionRes.data?.session_id) {
          setSession(sessionRes.data);
        } else {
          setError(
            sessionRes.data?.detail ??
              sessionRes.error ??
              'Could not load session information.'
          );
        }

        if (evalRes.ok && evalRes.data) {
          setEvaluation(evalRes.data);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setLoading(false);
          setError(err instanceof Error ? err.message : 'Failed to load report data.');
        }
      }
    };

    loadData();

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
            <h1 className="dash-greeting__title">Learning Report</h1>
            <div className="dash-alert" role="alert" style={{ marginTop: '1rem' }}>
              {error || 'Session report not available.'}
            </div>
            <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.65rem' }}>
              <Link href={`/session/${sessionId}/details`} className="dash-btn">
                Session details
              </Link>
              <Link href="/dashboard" className="dash-btn dash-btn--sm">
                Dashboard
              </Link>
            </div>
          </section>
        </main>
      </div>
    );
  }

  const preTest = session.tests?.pre;
  const postTest = session.tests?.post;
  const preScore = evaluation?.pre_score ?? null;
  const postScore = evaluation?.post_score ?? null;
  const absoluteGain = evaluation?.absolute_gain ?? null;
  const normalizedGain = evaluation?.normalized_gain ?? null;
  const gainLabel = evaluation?.gain_label ?? null;

  const teacherTurns = evaluation?.teaching_stats?.teacher_turns ?? 0;
  const avgResponse = evaluation?.teaching_stats?.avg_response_seconds ?? null;
  const correctedCount = evaluation?.misconceptions_corrected ?? 0;
  const totalMisconceptions = evaluation?.misconceptions_total ?? session.misconceptions.length;

  return (
    <div className="details-page dash-page">
      <main className="dash-container">
        {/* Header Hero Card matching dashboard theme */}
        <section className="dash-card">
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
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
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                Verified Learning Report
              </div>
              <h1 className="dash-greeting__title">{session.topic || 'Learning Report'}</h1>
              <p className="dash-greeting__text">
                Psychometric baseline pre-test, conversational teaching telemetry, and post-instruction mastery evaluation.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Link href={`/session/${sessionId}/chat`} className="dash-btn dash-btn--sm">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
                </svg>
                Continue Chat
              </Link>
              <Link href={`/session/${sessionId}/details`} className="dash-btn dash-btn--sm">
                Overview
              </Link>
              <Link href="/dashboard" className="dash-btn dash-btn--sm">
                Dashboard
              </Link>
            </div>
          </div>
        </section>

        {/* Action Navigation Tabs */}
        <nav className="details-nav">
          <Link href={`/session/${sessionId}/chat`} className="details-nav-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
            </svg>
            Teaching Chat
          </Link>
          <Link href={`/session/${sessionId}/study`} className="details-nav-btn">
            Study Guide
          </Link>
          <Link href={`/session/${sessionId}/pretest`} className="details-nav-btn">
            Pre-test
          </Link>
          <Link href={`/session/${sessionId}/posttest`} className="details-nav-btn">
            Post-test
          </Link>
          <Link href={`/session/${sessionId}/report`} className="details-nav-btn details-nav-btn--primary">
            Learning Report
          </Link>
          <Link href={`/session/${sessionId}/details`} className="details-nav-btn">
            Session Details
          </Link>
        </nav>

        {/* High-Level Diagnostic Score Overview */}
        <section className="dash-card">
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.8rem', marginBottom: '1.25rem' }}>
            <div>
              <h2 className="dash-card__title" style={{ margin: 0 }}>Assessment Performance Comparison</h2>
              <p className="dash-card__text" style={{ margin: '0.25rem 0 0' }}>
                Comparing student baseline entry knowledge vs post-teaching comprehension.
              </p>
            </div>
            {gainLabel && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '0.35rem 0.85rem',
                  borderRadius: '999px',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  background: gainLabel === 'high' ? '#e6f7ef' : gainLabel === 'medium' ? '#fef6e7' : '#fdf3f2',
                  border: `1px solid ${gainLabel === 'high' ? 'rgba(43,122,99,0.4)' : gainLabel === 'medium' ? 'rgba(183,121,31,0.4)' : 'rgba(180,68,60,0.4)'}`,
                  color: gainLabel === 'high' ? '#2b7a63' : gainLabel === 'medium' ? '#b7791f' : '#b4443c',
                }}
              >
                {gainLabel} Learning Gain
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.2rem' }}>
            {/* Pre-Test Box */}
            <div
              style={{
                padding: '1.25rem',
                borderRadius: '16px',
                background: '#eff8f3',
                border: '1px solid rgba(111,175,154,0.3)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#3e8b75' }}>
                    Pre-Test Baseline
                  </span>
                  <span style={{ fontSize: '0.76rem', color: '#52615b' }}>
                    {preTest?.submitted_at ? formatDate(preTest.submitted_at) : 'Pending'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginTop: '0.65rem' }}>
                  <span style={{ fontSize: '2.4rem', fontWeight: 800, color: '#0d1110', lineHeight: 1 }}>
                    {formatScore(preScore)}
                  </span>
                </div>
                <p style={{ margin: '0.45rem 0 0', fontSize: '0.84rem', color: '#52615b', lineHeight: 1.45 }}>
                  Evaluated baseline understanding before instructional dialogues began.
                </p>
              </div>

              {!preTest?.submitted_at ? (
                <Link
                  href={`/session/${sessionId}/pretest`}
                  className="details-nav-btn details-nav-btn--primary"
                  style={{ marginTop: '1rem', width: 'fit-content', fontSize: '0.82rem', padding: '0.45rem 0.95rem' }}
                >
                  Take Pre-test Now →
                </Link>
              ) : (
                <div style={{ marginTop: '0.9rem', fontSize: '0.78rem', color: '#2b7a63', fontWeight: 600 }}>
                  ✓ Baseline Recorded
                </div>
              )}
            </div>

            {/* Post-Test Box */}
            <div
              style={{
                padding: '1.25rem',
                borderRadius: '16px',
                background: '#ffffff',
                border: '1px solid rgba(111,175,154,0.4)',
                boxShadow: '0 4px 16px rgba(111,175,154,0.08)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6faf9a' }}>
                    Post-Test Mastery
                  </span>
                  <span style={{ fontSize: '0.76rem', color: '#52615b' }}>
                    {postTest?.submitted_at ? formatDate(postTest.submitted_at) : 'Pending'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginTop: '0.65rem' }}>
                  <span style={{ fontSize: '2.4rem', fontWeight: 800, color: '#0d1110', lineHeight: 1 }}>
                    {formatScore(postScore)}
                  </span>
                </div>
                <p style={{ margin: '0.45rem 0 0', fontSize: '0.84rem', color: '#52615b', lineHeight: 1.45 }}>
                  Knowledge verified after resolving student misconceptions through teaching chat.
                </p>
              </div>

              {!postTest?.submitted_at ? (
                <Link
                  href={`/session/${sessionId}/posttest`}
                  className="details-nav-btn details-nav-btn--primary"
                  style={{ marginTop: '1rem', width: 'fit-content', fontSize: '0.82rem', padding: '0.45rem 0.95rem' }}
                >
                  Complete Post-test →
                </Link>
              ) : (
                <div style={{ marginTop: '0.9rem', fontSize: '0.78rem', color: '#2b7a63', fontWeight: 600 }}>
                  ✓ Post-Test Completed
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 4-Stat Metric Cards Grid */}
        <div className="dash-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          {/* Absolute Gain */}
          <section className="dash-card" style={{ padding: '1.25rem' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#52615b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Absolute Learning Gain
            </span>
            <p style={{ margin: '0.5rem 0 0.25rem', fontSize: '1.85rem', fontWeight: 800, color: '#0d1110', lineHeight: 1 }}>
              {absoluteGain !== null ? `${absoluteGain > 0 ? '+' : ''}${absoluteGain}%` : '—'}
            </p>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#52615b' }}>
              {absoluteGain !== null
                ? `Post-test score difference`
                : 'Awaiting both assessment submissions'}
            </p>
          </section>

          {/* Normalized Gain */}
          <section className="dash-card" style={{ padding: '1.25rem' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#52615b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Normalized Gain (g)
            </span>
            <p style={{ margin: '0.5rem 0 0.25rem', fontSize: '1.85rem', fontWeight: 800, color: '#0d1110', lineHeight: 1 }}>
              {normalizedGain !== null ? normalizedGain.toFixed(2) : '—'}
            </p>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#52615b' }}>
              Hake&apos;s educational metric of potential gain achieved
            </p>
          </section>

          {/* Corrected Misconceptions */}
          <section className="dash-card" style={{ padding: '1.25rem' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#52615b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Misconceptions Learned
            </span>
            <p style={{ margin: '0.5rem 0 0.25rem', fontSize: '1.85rem', fontWeight: 800, color: '#0d1110', lineHeight: 1 }}>
              {correctedCount} / {totalMisconceptions}
            </p>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#52615b' }}>
              {Math.round((correctedCount / Math.max(1, totalMisconceptions)) * 100)}% resolved via Socratic dialogue
            </p>
          </section>

          {/* Teaching Turns */}
          <section className="dash-card" style={{ padding: '1.25rem' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#52615b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Teaching Turns
            </span>
            <p style={{ margin: '0.5rem 0 0.25rem', fontSize: '1.85rem', fontWeight: 800, color: '#0d1110', lineHeight: 1 }}>
              {teacherTurns}
            </p>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#52615b' }}>
              {avgResponse ? `Avg turn response: ${avgResponse.toFixed(1)}s` : 'Dialogue messages exchanged'}
            </p>
          </section>
        </div>

        {/* Concept Breakdown Table */}
        <section className="dash-card">
          <h2 className="dash-card__title">Concept-by-Concept Mastery Breakdown</h2>
          <p className="dash-card__text">
            Individual resolution status and test outcome tracking for each identified topic misconception.
          </p>

          {(!evaluation?.per_concept || evaluation.per_concept.length === 0) ? (
            <div style={{ marginTop: '1rem', padding: '1.5rem', borderRadius: '14px', background: '#eff8f3', textAlign: 'center', border: '1px dashed rgba(111,175,154,0.35)' }}>
              <p style={{ margin: 0, fontWeight: 600, color: '#0d1110', fontSize: '0.92rem' }}>
                Per-concept matrix will populate as tests and teaching progress
              </p>
              <p style={{ margin: '0.35rem 0 0', fontSize: '0.84rem', color: '#52615b' }}>
                Complete the diagnostic evaluations to see baseline vs post-test accuracy mapped to each concept.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto', marginTop: '1.15rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid rgba(111,175,154,0.35)', color: '#0d1110' }}>
                    <th style={{ padding: '0.75rem 0.5rem', fontWeight: 700 }}>Concept Area</th>
                    <th style={{ padding: '0.75rem 0.5rem', fontWeight: 700 }}>Nova State</th>
                    <th style={{ padding: '0.75rem 0.5rem', fontWeight: 700 }}>Tries</th>
                    <th style={{ padding: '0.75rem 0.5rem', fontWeight: 700 }}>Pre-Test Result</th>
                    <th style={{ padding: '0.75rem 0.5rem', fontWeight: 700 }}>Post-Test Result</th>
                  </tr>
                </thead>
                <tbody>
                  {evaluation.per_concept.map((item, idx) => (
                    <tr
                      key={`${item.concept}-${idx}`}
                      style={{
                        borderBottom: '1px solid rgba(111,175,154,0.18)',
                        background: idx % 2 === 0 ? 'transparent' : 'rgba(239,248,243,0.4)',
                      }}
                    >
                      <td style={{ padding: '0.85rem 0.5rem', fontWeight: 600, color: '#0d1110' }}>
                        {item.concept || `Concept ${idx + 1}`}
                      </td>
                      <td style={{ padding: '0.85rem 0.5rem' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '999px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            background: item.status === 'learned' ? '#e6f7ef' : item.status === 'testing' ? '#eef7fc' : '#eff8f3',
                            border: `1px solid ${item.status === 'learned' ? 'rgba(43,122,99,0.35)' : 'rgba(111,175,154,0.35)'}`,
                            color: item.status === 'learned' ? '#2b7a63' : item.status === 'testing' ? '#3e8b75' : '#52615b',
                          }}
                        >
                          {item.status ? item.status.replace('_', ' ') : 'Active'}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 0.5rem', color: '#52615b', fontWeight: 500 }}>
                        {item.tries ?? 0}
                      </td>
                      <td style={{ padding: '0.85rem 0.5rem' }}>
                        {item.pre_correct === true && <span style={{ color: '#2b7a63', fontWeight: 700 }}>✓ Correct</span>}
                        {item.pre_correct === false && <span style={{ color: '#b4443c', fontWeight: 700 }}>✕ Incorrect</span>}
                        {item.pre_correct === null && <span style={{ color: '#8a9a93' }}>—</span>}
                      </td>
                      <td style={{ padding: '0.85rem 0.5rem' }}>
                        {item.post_correct === true && <span style={{ color: '#2b7a63', fontWeight: 700 }}>✓ Correct</span>}
                        {item.post_correct === false && <span style={{ color: '#b4443c', fontWeight: 700 }}>✕ Incorrect</span>}
                        {item.post_correct === null && <span style={{ color: '#8a9a93' }}>—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Learning Objectives & Session Grounding Card */}
        <section className="dash-card">
          <h2 className="dash-card__title">Grounding Knowledge & Objectives</h2>
          <div style={{ marginTop: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {session.learning_objectives?.length ? (
              <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.88rem', color: '#52615b' }}>
                {session.learning_objectives.map((obj) => (
                  <li key={obj} style={{ lineHeight: 1.5 }}>
                    <strong style={{ color: '#0d1110' }}>Objective: </strong>{obj}
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ margin: 0, fontSize: '0.88rem', color: '#52615b' }}>
                All topics are grounded directly in the course knowledge base.
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
