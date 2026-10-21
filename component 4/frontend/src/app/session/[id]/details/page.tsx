// app/session/[id]/details/page.tsx
'use client';

import { use, useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import EvaluationSummary from '../../../components/EvaluationSummary';
import ProgressCard from '../../../components/ProgressCard';
import {
  apiRequest,
  getAccessToken,
  getServerAuthSnapshot,
  subscribeAuth,
} from '../../../utils/api';
import { useRoleGuard } from '../../../utils/useRoleGuard';
import type {
  ApiError,
  SessionState,
  UnderstandingSummary,
} from '../../../utils/types';
import '../../../components/dashboard/dashboard.css';
import './details.css';

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
}

function formatScore(value: number | null | undefined): string {
  return typeof value === 'number' ? `${Math.round(value)}%` : '—';
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

function eventText(event: SessionState['events'][number]): string {
  if (typeof event.text === 'string') return event.text;
  if (typeof event.error === 'string') return event.error;
  if (typeof event.question === 'string') return event.question;
  if (typeof event.to === 'string') {
    return `${typeof event.from === 'string' ? `${event.from} → ` : ''}${event.to}`;
  }
  return '';
}

export default function SessionDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const token = useSyncExternalStore(subscribeAuth, getAccessToken, getServerAuthSnapshot);
  const { ready } = useRoleGuard('student');

  const { id: sessionId } = use(params);
  const [state, setState] = useState<SessionState | null>(null);
  const [summary, setSummary] = useState<UnderstandingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token || !sessionId) return;
    let cancelled = false;

    const load = async () => {
      const [stateRes, summaryRes] = await Promise.all([
        apiRequest<SessionState & ApiError>(`/sessions/${sessionId}`, 'GET'),
        apiRequest<UnderstandingSummary & ApiError>(
          `/sessions/${sessionId}/summary`,
          'GET'
        ),
      ]);
      if (cancelled) return;

      setLoading(false);
      if (stateRes.ok && stateRes.data?.session_id) {
        setState(stateRes.data);
      } else {
        setError(
          stateRes.data?.detail ?? stateRes.error ?? 'Could not load this session.'
        );
      }
      if (summaryRes.ok && summaryRes.data?.misconceptions) {
        setSummary(summaryRes.data);
      }
    };
    load();

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

  if (error || !state) {
    return (
      <div className="details-page dash-page">
        <main className="dash-container">
          <section className="dash-card">
            <h1 className="dash-greeting__title">Session details</h1>
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

  const pre = state.tests?.pre;
  const post = state.tests?.post;

  return (
    <div className="details-page dash-page">
      <main className="dash-container">
        {/* Header Section */}
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
                  <circle cx="12" cy="12" r="10" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
                Session Overview
              </div>
              <h1 className="dash-greeting__title">{state.topic || 'Nova session'}</h1>
              <p className="dash-greeting__text">
                Session ID: <code style={{ background: '#eff8f3', padding: '0.15rem 0.45rem', borderRadius: '6px', border: '1px solid rgba(111,175,154,0.3)', color: '#0d1110', fontSize: '0.86rem' }}>{state.session_id}</code>
              </p>
            </div>
            <Link href="/dashboard" className="dash-btn dash-btn--sm">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
              Back to dashboard
            </Link>
          </div>
        </section>

        {/* Action Navigation */}
        <nav className="details-nav">
          <Link href={`/session/${state.session_id}/chat`} className="details-nav-btn details-nav-btn--primary">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
            </svg>
            Teaching Chat
          </Link>
          <Link href={`/session/${state.session_id}/study`} className="details-nav-btn">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
            Study Guide
          </Link>
          <Link href={`/session/${state.session_id}/pretest`} className="details-nav-btn">
            Pre-test
          </Link>
          <Link href={`/session/${state.session_id}/posttest`} className="details-nav-btn">
            Post-test
          </Link>
          <Link href={`/session/${state.session_id}/report`} className="details-nav-btn">
            Learning Report
          </Link>
          <Link href={`/session/${state.session_id}/exam`} className="details-nav-btn">
            Run Exam
          </Link>
        </nav>

        {/* Learning Evaluation Summary */}
        <EvaluationSummary sessionId={state.session_id} />

        {/* Progress & Session Info Grid */}
        <div className="dash-grid">
          <ProgressCard data={summary} loading={false} />

          <section className="dash-card">
            <h2 className="dash-card__title">Session Info</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', margin: '1rem 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                <span style={{ color: 'var(--d-muted)', fontWeight: 500 }}>Created</span>
                <span style={{ fontWeight: 600, color: '#0d1110' }}>{formatDate(state.created_at)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                <span style={{ color: 'var(--d-muted)', fontWeight: 500 }}>Updated</span>
                <span style={{ fontWeight: 600, color: '#0d1110' }}>{formatDate(state.updated_at)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                <span style={{ color: 'var(--d-muted)', fontWeight: 500 }}>Knowledge Base</span>
                <span style={{ fontWeight: 600, color: '#0d1110' }}>{state.kb_id || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                <span style={{ color: 'var(--d-muted)', fontWeight: 500 }}>Concepts Tracked</span>
                <span style={{ fontWeight: 600, color: '#0d1110' }}>{state.misconceptions.length}</span>
              </div>
            </div>

            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '1.25rem 0 0.5rem', color: '#0d1110', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Learning Objectives
            </h3>
            {state.learning_objectives?.length ? (
              <ul style={{ margin: 0, paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.88rem', color: 'var(--d-muted)' }}>
                {state.learning_objectives.map((objective) => (
                  <li key={objective}>{objective}</li>
                ))}
              </ul>
            ) : (
              <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--d-muted)' }}>No objectives recorded.</p>
            )}
          </section>
        </div>

        {/* Tests Card */}
        <section className="dash-card">
          <h2 className="dash-card__title">Tests Overview</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
            <div className="details-stat-box">
              <span className="details-stat-box__label">Pre-test</span>
              <span className="details-stat-box__val" style={{ color: pre?.submitted_at ? '#2b7a63' : 'var(--d-muted)' }}>
                {pre?.submitted_at ? formatScore(pre.score?.overall_percentage) : 'Not submitted'}
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--d-muted)' }}>
                {pre?.submitted_at ? formatDate(pre.submitted_at) : 'Baseline knowledge assessment'}
              </span>
            </div>

            <div className="details-stat-box">
              <span className="details-stat-box__label">Post-test</span>
              <span className="details-stat-box__val" style={{ color: post?.submitted_at ? '#2b7a63' : 'var(--d-muted)' }}>
                {post?.submitted_at ? formatScore(post.score?.overall_percentage) : 'Not submitted'}
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--d-muted)' }}>
                {post?.submitted_at ? formatDate(post.submitted_at) : 'Post-teaching knowledge assessment'}
              </span>
            </div>
          </div>
        </section>

        {/* Misconceptions */}
        <section className="dash-card">
          <h2 className="dash-card__title">Misconceptions & Understanding</h2>
          <p className="dash-card__text">
            All targeted misunderstandings seeded for Nova in this session.
          </p>
          {state.misconceptions.length === 0 ? (
            <p className="dash-empty">No misconceptions in this session.</p>
          ) : (
            <ul style={{ listStyle: 'none', margin: '1rem 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {state.misconceptions.map((item) => {
                const row = summary?.misconceptions.find((entry) => entry.concept === item.concept);
                return (
                  <li key={item.id} className="details-item-card">
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: '0.98rem', color: '#0d1110' }}>
                        {item.concept || 'General'}
                      </p>
                      <span className={statusPillClass(item.status)}>
                        {item.status.replace('_', ' ')}
                      </span>
                    </div>

                    <p style={{ margin: '0 0 0.35rem', fontSize: '0.88rem', color: 'var(--d-muted)', lineHeight: 1.55 }}>
                      <strong style={{ color: '#0d1110' }}>Wrong belief: </strong>
                      {item.wrong_concept}
                    </p>
                    <p style={{ margin: '0 0 0.5rem', fontSize: '0.88rem', color: 'var(--d-muted)', lineHeight: 1.55 }}>
                      <strong style={{ color: '#0d1110' }}>Correct concept: </strong>
                      {item.correct_concept}
                    </p>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.78rem', color: 'var(--d-muted)', marginTop: '0.4rem' }}>
                      <span>Confidence: {Math.round(item.confidence * 100)}%</span>
                      {item.source_pages.length > 0 && (
                        <span>Source: Page {item.source_pages.join(', ')}</span>
                      )}
                      {row && <span>Attempts: {row.tries}</span>}
                    </div>

                    {item.source_quote && (
                      <blockquote style={{ margin: '0.65rem 0 0', paddingLeft: '0.85rem', borderLeft: '3px solid #6faf9a', fontStyle: 'italic', fontSize: '0.82rem', color: 'var(--d-muted)' }}>
                        &ldquo;{item.source_quote}&rdquo;
                      </blockquote>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Recent Events */}
        <section className="dash-card">
          <h2 className="dash-card__title">Recent Session Events</h2>
          <p className="dash-card__text">Audit log of student messages, checks, and test activity.</p>
          {state.events.length === 0 ? (
            <p className="dash-empty">No events recorded yet.</p>
          ) : (
            <ol style={{ listStyle: 'none', margin: '0.75rem 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {state.events.slice(-12).reverse().map((event, index) => (
                <li key={`${event.time}-${index}`} className="details-event-row">
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, color: '#3e8b75', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.04em' }}>
                      {event.type.replace('_', ' ')}
                    </span>
                    <span style={{ color: 'var(--d-faint)', fontSize: '0.74rem' }}>{formatDate(event.time)}</span>
                  </div>
                  {eventText(event) && (
                    <span style={{ color: 'var(--d-muted)', lineHeight: 1.45, fontSize: '0.82rem' }}>
                      {eventText(event)}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          )}
        </section>
      </main>
    </div>
  );
}
