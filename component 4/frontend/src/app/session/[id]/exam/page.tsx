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
import type { ApiError, ExamQuestionResult, ExamResponse } from '../../../utils/types';

function ResultList({
  title,
  items,
  tone,
}: {
  title: string;
  items: ExamQuestionResult[];
  tone: string;
}) {
  return (
    <div>
      <h3 className={`text-sm font-semibold ${tone}`}>{title}</h3>
      {items.length === 0 ? (
        <p className="mt-1 text-sm text-gray-500">None.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {items.map((item, index) => (
            <li
              key={`${title}-${index}`}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
            >
              <p className="text-gray-100">{item.question}</p>
              <p className="mt-1 text-xs text-gray-400">Nova answered: {item.nova_answer}</p>
              <p className="text-xs text-gray-500">Expected: {String(item.expected_answer)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ExamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = use(params);
  const router = useRouter();
  const token = useSyncExternalStore(subscribeAuth, getAccessToken, getServerAuthSnapshot);

  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ExamResponse | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) router.replace('/login');
  }, [token, router]);

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
    setError(res.data?.detail ?? res.error ?? 'The exam could not run.');
  };

  if (!token) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <span className="spinner" />
      </main>
    );
  }

  return (
    <div className="min-h-screen">
      <main className="mx-auto w-full max-w-3xl space-y-4 px-4 py-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Assessment exam</h1>
            <p className="mt-1 text-sm text-gray-400">
              Ask Nova to answer assessment questions using her current beliefs.
            </p>
          </div>
          <Link
            href={`/session/${sessionId}/details`}
            className="rounded-lg border border-white/15 px-3 py-2 text-sm text-gray-200 transition hover:bg-white/10"
          >
            Session details
          </Link>
        </div>

        <section className="card">
          <p className="text-sm leading-relaxed text-gray-400">
            This uses the exam endpoint: it generates questions from the session&apos;s
            misconceptions, asks Nova to answer them, and scores Nova&apos;s answers.
            It can take a while on a local model.
          </p>
          {error && (
            <p
              className="mt-3 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300"
              role="alert"
            >
              {error}
            </p>
          )}
          <button type="button" className="button mt-4" onClick={runExam} disabled={running}>
            {running ? <span className="spinner" /> : 'Run exam'}
          </button>
        </section>

        {result && (
          <section className="card space-y-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-xl font-semibold">Exam result</h2>
              <p className="text-2xl font-bold text-indigo-300">{result.score}%</p>
            </div>
            <p className="text-sm text-gray-400">
              {result.correct_answers.length} of {result.total_questions} answers matched
              Nova&apos;s expected assessment answer.
            </p>

            <ResultList
              title="Correct"
              items={result.correct_answers}
              tone="text-emerald-300"
            />
            <ResultList
              title="Incorrect"
              items={result.incorrect_answers}
              tone="text-rose-300"
            />

            <div>
              <h3 className="text-sm font-semibold text-gray-200">
                Remaining misconceptions ({result.remaining_misconceptions.length})
              </h3>
              {result.remaining_misconceptions.length === 0 ? (
                <p className="mt-1 text-sm text-gray-500">Nova has no remaining beliefs.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {result.remaining_misconceptions.map((item) => (
                    <li
                      key={item.id}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
                    >
                      <p className="text-gray-100">{item.concept || 'General'}</p>
                      <p className="mt-1 text-gray-400">{item.wrong_concept}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Link href={`/session/${sessionId}/chat`} className="button">
                Back to chat
              </Link>
              <Link
                href={`/session/${sessionId}/details`}
                className="rounded-lg border border-white/15 px-3 py-2 text-sm text-gray-200 transition hover:bg-white/10"
              >
                Session details
              </Link>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
