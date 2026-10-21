// app/components/EvaluationSummary.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiRequest } from '../utils/api';
import type {
  ApiError,
  GainLabel,
  LearningEvaluation,
} from '../utils/types';

const GAIN_STYLES: Record<GainLabel, string> = {
  high: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-800',
  medium: 'border-amber-500/40 bg-amber-500/15 text-amber-800',
  low: 'border-rose-500/40 bg-rose-500/15 text-rose-800',
};

function formatScore(value: number | null): string {
  return value === null ? 'Not taken yet' : `${Math.round(value)}%`;
}

function ScoreBar({
  label,
  score,
  fill,
  actionHref,
  actionText,
}: {
  label: string;
  score: number | null;
  fill: string;
  actionHref?: string;
  actionText?: string;
}) {
  const isPending = score === null;

  return (
    <div style={{ padding: '0.85rem 1rem', borderRadius: '12px', background: '#eff8f3', border: '1px solid rgba(111,175,154,0.25)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.88rem' }}>
        <span style={{ fontWeight: 600, color: '#0d1110' }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontWeight: 700, color: isPending ? '#52615b' : '#0d1110' }}>
            {formatScore(score)}
          </span>
          {isPending && actionHref && actionText && (
            <Link
              href={actionHref}
              style={{
                fontSize: '0.78rem',
                fontWeight: 600,
                color: '#3e8b75',
                textDecoration: 'underline',
                textUnderlineOffset: '3px',
              }}
            >
              {actionText} →
            </Link>
          )}
        </div>
      </div>
      <div
        style={{
          marginTop: '0.6rem',
          height: '8px',
          width: '100%',
          overflow: 'hidden',
          borderRadius: '999px',
          background: 'rgba(111,175,154,0.2)',
        }}
      >
        <div
          className={fill}
          style={{
            height: '100%',
            borderRadius: '999px',
            width: `${score ?? 0}%`,
            transition: 'all 0.4s ease',
          }}
        />
      </div>
    </div>
  );
}

export default function EvaluationSummary({ sessionId }: { sessionId: string }) {
  const [data, setData] = useState<LearningEvaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    apiRequest<LearningEvaluation & ApiError>(
      `/sessions/${sessionId}/evaluation`,
      'GET'
    ).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (res.ok && res.data) {
        setData(res.data);
      } else {
        setError(res.data?.detail ?? res.error ?? 'Could not load the evaluation.');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (loading) {
    return (
      <section className="card">
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#0d1110' }}>Learning Evaluation</h2>
        <p style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', color: '#52615b' }}>
          <span className="spinner" /> Loading evaluation results…
        </p>
      </section>
    );
  }

  if (error || !data) {
    return (
      <section className="card">
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#0d1110' }}>Learning Evaluation</h2>
        <p
          style={{
            marginTop: '0.75rem',
            padding: '0.75rem 1rem',
            borderRadius: '10px',
            background: '#fdf3f2',
            border: '1px solid rgba(180, 68, 60, 0.3)',
            color: '#b4443c',
            fontSize: '0.88rem',
          }}
          role="alert"
        >
          {error || 'Evaluation is not available yet.'}
        </p>
      </section>
    );
  }

  const avg = data.teaching_stats.avg_response_seconds;
  const gain = data.absolute_gain;
  const normalized = data.normalized_gain;
  const isSessionStarted =
    data.pre_score !== null ||
    data.post_score !== null ||
    data.teaching_stats.teacher_turns > 0;

  return (
    <section className="card">
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#0d1110' }}>Learning Evaluation</h2>
            {!isSessionStarted && (
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '0.15rem 0.55rem',
                  borderRadius: '999px',
                  background: '#eff8f3',
                  border: '1px solid rgba(111,175,154,0.4)',
                  color: '#3e8b75',
                }}
              >
                Not Started
              </span>
            )}
          </div>
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.88rem', color: '#52615b', lineHeight: 1.5 }}>
            Measures your learning gain by comparing baseline test performance with post-teaching results.
          </p>
        </div>

        {data.gain_label && (
          <span
            className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${GAIN_STYLES[data.gain_label]}`}
          >
            {data.gain_label} gain
          </span>
        )}
      </div>

      {/* Helpful banner when session is just created / not started yet */}
      {!isSessionStarted && (
        <div
          style={{
            marginTop: '1.15rem',
            padding: '1rem 1.25rem',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #eff8f3 0%, #ffffff 100%)',
            border: '1px solid rgba(111,175,154,0.35)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <div style={{ maxWidth: '650px' }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: '0.92rem', color: '#0d1110' }}>
              You just created this session!
            </p>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.84rem', color: '#52615b', lineHeight: 1.5 }}>
              Follow these simple steps: review the <strong>Study Guide</strong>, take the <strong>Pre-test</strong> to gauge your baseline knowledge, and start <strong>Teaching Chat</strong> with Nova. Your evaluation metrics will compute automatically!
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Link
              href={`/session/${sessionId}/study`}
              className="details-nav-btn details-nav-btn--primary"
              style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem' }}
            >
              Open Study Guide
            </Link>
            <Link
              href={`/session/${sessionId}/pretest`}
              className="details-nav-btn"
              style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem' }}
            >
              Take Pre-test
            </Link>
          </div>
        </div>
      )}

      {/* Assessment Scores */}
      <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <ScoreBar
          label="Pre-test (Baseline)"
          score={data.pre_score}
          fill="bg-indigo-500"
          actionHref={`/session/${sessionId}/pretest`}
          actionText="Take pre-test"
        />
        <ScoreBar
          label="Post-test (After Teaching)"
          score={data.post_score}
          fill="bg-emerald-500"
          actionHref={`/session/${sessionId}/posttest`}
          actionText={data.pre_score !== null ? 'Take post-test' : undefined}
        />
      </div>

      {/* Metric Breakdown Cards */}
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
          <p className="text-xs uppercase tracking-wide text-gray-500">Learning Gain</p>
          <p className="mt-1 text-lg font-semibold text-gray-100">
            {gain === null ? 'Pending Tests' : `${gain > 0 ? '+' : ''}${gain} pts`}
          </p>
          <p className="mt-0.5 text-xs text-gray-400">
            {gain === null ? 'Requires pre & post tests' : `normalized ${normalized === null ? '—' : normalized.toFixed(2)}`}
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Misconceptions Corrected
          </p>
          <p className="mt-1 text-lg font-semibold text-gray-100">
            {data.misconceptions_corrected} / {data.misconceptions_total}
          </p>
          <p className="mt-0.5 text-xs text-gray-400">
            {data.concepts_explained === 0
              ? 'Start teaching in chat'
              : `${data.concepts_explained} concepts explained`}
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Teaching Activity
          </p>
          <p className="mt-1 text-lg font-semibold text-gray-100">
            {data.teaching_stats.teacher_turns === 0
              ? '0 turns'
              : `${data.teaching_stats.teacher_turns} turns`}
          </p>
          <p className="mt-0.5 text-xs text-gray-400">
            {avg === null ? 'No chat messages yet' : `Avg response: ${avg.toFixed(1)}s`}
          </p>
        </div>
      </div>
    </section>
  );
}

