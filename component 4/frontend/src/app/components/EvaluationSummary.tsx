// app/components/EvaluationSummary.tsx
'use client';

import { useEffect, useState } from 'react';
import { apiRequest } from '../utils/api';
import type {
  ApiError,
  GainLabel,
  LearningEvaluation,
} from '../utils/types';

const GAIN_STYLES: Record<GainLabel, string> = {
  high: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
  medium: 'border-amber-500/40 bg-amber-500/15 text-amber-300',
  low: 'border-rose-500/40 bg-rose-500/15 text-rose-300',
};

function formatScore(value: number | null): string {
  return value === null ? '—' : `${Math.round(value)}%`;
}

function ScoreBar({
  label,
  score,
  fill,
}: {
  label: string;
  score: number | null;
  fill: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-gray-300">{label}</span>
        <span className="font-semibold text-gray-100">{formatScore(score)}</span>
      </div>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full ${fill} transition-all`}
          style={{ width: `${score ?? 0}%` }}
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
        <h1 className="text-xl font-semibold">Learning evaluation</h1>
        <p className="mt-3 flex items-center gap-3 text-sm text-gray-400">
          <span className="spinner" /> Loading your results…
        </p>
      </section>
    );
  }

  if (error || !data) {
    return (
      <section className="card">
        <h1 className="text-xl font-semibold">Learning evaluation</h1>
        <p
          className="mt-3 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300"
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

  return (
    <section className="card">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Learning evaluation</h1>
          <p className="mt-1 text-sm text-gray-400">
            Student learning gain from the pre-test to the post-test.
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

      <div className="mt-5 space-y-4">
        <ScoreBar label="Pre-test" score={data.pre_score} fill="bg-indigo-500" />
        <ScoreBar label="Post-test" score={data.post_score} fill="bg-emerald-500" />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
          <p className="text-xs uppercase tracking-wide text-gray-500">Gain</p>
          <p className="mt-1 text-lg font-semibold text-gray-100">
            {gain === null ? '—' : `${gain > 0 ? '+' : ''}${gain} pts`}
          </p>
          <p className="mt-0.5 text-xs text-gray-400">
            normalized {normalized === null ? '—' : normalized.toFixed(2)}
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Corrected
          </p>
          <p className="mt-1 text-lg font-semibold text-gray-100">
            {data.misconceptions_corrected} / {data.misconceptions_total}
          </p>
          <p className="mt-0.5 text-xs text-gray-400">
            {data.concepts_explained} concepts explained
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Avg response time
          </p>
          <p className="mt-1 text-lg font-semibold text-gray-100">
            {avg === null ? '—' : `${avg.toFixed(1)}s`}
          </p>
          <p className="mt-0.5 text-xs text-gray-400">
            {data.teaching_stats.teacher_turns} teacher{' '}
            {data.teaching_stats.teacher_turns === 1 ? 'turn' : 'turns'}
          </p>
        </div>
      </div>
    </section>
  );
}
