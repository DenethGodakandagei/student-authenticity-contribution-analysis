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

const STATUS_STYLES: Record<string, string> = {
  active: 'border-amber-500/40 bg-amber-500/15 text-amber-300',
  testing: 'border-sky-500/40 bg-sky-500/15 text-sky-300',
  learned: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
  needs_review: 'border-rose-500/40 bg-rose-500/15 text-rose-300',
};

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
}

function formatScore(value: number | null | undefined): string {
  return typeof value === 'number' ? `${Math.round(value)}%` : '—';
}

function statusClass(status: string): string {
  return STATUS_STYLES[status] ?? 'border-white/20 bg-white/10 text-gray-300';
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
      <main className="flex min-h-screen items-center justify-center">
        <span className="spinner" />
      </main>
    );
  }

  if (error || !state) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-8">
        <section className="card">
          <h1 className="text-xl font-semibold">Session details</h1>
          <p
            className="mt-3 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300"
            role="alert"
          >
            {error || 'Session not found.'}
          </p>
          <Link href="/dashboard" className="button mt-4">
            Back to dashboard
          </Link>
        </section>
      </main>
    );
  }

  const pre = state.tests?.pre;
  const post = state.tests?.post;

  return (
    <div className="min-h-screen">
      <main className="mx-auto w-full max-w-4xl space-y-4 px-4 py-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{state.topic || 'Nova session'}</h1>
            <p className="mt-1 text-sm text-gray-400">
              Session <code>{state.session_id}</code>
            </p>
          </div>
          <Link href="/dashboard" className="rounded-lg border border-white/15 px-3 py-2 text-sm text-gray-200 transition hover:bg-white/10">
            Back to dashboard
          </Link>
        </div>

        <nav className="flex flex-wrap gap-2">
          <Link href={`/session/${state.session_id}/chat`} className="button">
            Chat
          </Link>
          <Link href={`/session/${state.session_id}/pretest`} className="button">
            Pre-test
          </Link>
          <Link href={`/session/${state.session_id}/posttest`} className="button">
            Post-test
          </Link>
          <Link href={`/session/${state.session_id}/report`} className="button">
            Report
          </Link>
          <Link href={`/session/${state.session_id}/exam`} className="button">
            Run exam
          </Link>
        </nav>

        <EvaluationSummary sessionId={state.session_id} />

        <div className="grid gap-4 lg:grid-cols-2">
          <ProgressCard data={summary} loading={false} />

          <section className="card">
            <h2 className="text-lg font-semibold">Session info</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-gray-400">Created</dt>
                <dd className="text-right text-gray-200">{formatDate(state.created_at)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-400">Updated</dt>
                <dd className="text-right text-gray-200">{formatDate(state.updated_at)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-400">Knowledge base</dt>
                <dd className="text-right text-gray-200">{state.kb_id || '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-400">Concepts tracked</dt>
                <dd className="text-right text-gray-200">{state.misconceptions.length}</dd>
              </div>
            </dl>

            <h3 className="mt-5 text-sm font-semibold text-gray-200">Learning objectives</h3>
            {state.learning_objectives?.length ? (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-300">
                {state.learning_objectives.map((objective) => (
                  <li key={objective}>{objective}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-gray-500">No objectives recorded.</p>
            )}
          </section>
        </div>

        <section className="card">
          <h2 className="text-lg font-semibold">Tests</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm">
              <p className="text-gray-400">Pre-test</p>
              <p className="mt-1 font-semibold text-gray-100">
                {pre?.submitted_at ? formatScore(pre.score?.overall_percentage) : 'Not submitted'}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm">
              <p className="text-gray-400">Post-test</p>
              <p className="mt-1 font-semibold text-gray-100">
                {post?.submitted_at ? formatScore(post.score?.overall_percentage) : 'Not submitted'}
              </p>
            </div>
          </div>
        </section>

        <section className="card">
          <h2 className="text-lg font-semibold">Misconceptions</h2>
          {state.misconceptions.length === 0 ? (
            <p className="mt-2 text-sm text-gray-500">No misconceptions in this session.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {state.misconceptions.map((item) => {
                const row = summary?.misconceptions.find((entry) => entry.concept === item.concept);
                return (
                  <li key={item.id} className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium text-gray-100">{item.concept || 'General'}</p>
                      <span className={`rounded-full border px-2 py-0.5 text-xs ${statusClass(item.status)}`}>
                        {item.status}
                      </span>
                    </div>
                    <p className="mt-2 text-gray-300">
                      <span className="text-gray-500">Wrong belief: </span>
                      {item.wrong_concept}
                    </p>
                    <p className="mt-1 text-gray-300">
                      <span className="text-gray-500">Correct concept: </span>
                      {item.correct_concept}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      confidence {Math.round(item.confidence * 100)}%
                      {item.source_pages.length ? ` · page ${item.source_pages.join(', ')}` : ''}
                      {row ? ` · ${row.tries} ${row.tries === 1 ? 'try' : 'tries'}` : ''}
                    </p>
                    {item.source_quote && (
                      <p className="mt-2 text-xs italic text-gray-400">
                        &ldquo;{item.source_quote}&rdquo;
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="card">
          <h2 className="text-lg font-semibold">Recent events</h2>
          {state.events.length === 0 ? (
            <p className="mt-2 text-sm text-gray-500">No events yet.</p>
          ) : (
            <ol className="mt-3 space-y-1.5 text-xs">
              {state.events.slice(-12).reverse().map((event, index) => (
                <li key={`${event.time}-${index}`} className="rounded bg-white/5 px-2 py-1.5">
                  <span className="font-medium text-indigo-300">{event.type}</span>{' '}
                  <span className="text-gray-500">{formatDate(event.time)}</span>
                  {eventText(event) && (
                    <span className="mt-0.5 block line-clamp-2 text-gray-400">
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
