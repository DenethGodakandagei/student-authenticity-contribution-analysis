// app/page.tsx — dashboard
'use client';

import { useEffect, useSyncExternalStore, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  apiRequest,
  getAccessToken,
  getServerAuthSnapshot,
  getStoredUserRaw,
  subscribeAuth,
} from './utils/api';
import type { ApiError, CreateSessionResponse, SessionListItem } from './utils/types';

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
}

export default function Dashboard() {
  const router = useRouter();
  const token = useSyncExternalStore(subscribeAuth, getAccessToken, getServerAuthSnapshot);
  const userRaw = useSyncExternalStore(subscribeAuth, getStoredUserRaw, getServerAuthSnapshot);

  const [sessions, setSessions] = useState<SessionListItem[] | null>(null);
  const [sessionsError, setSessionsError] = useState('');
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState('');

  let userName = '';
  if (userRaw) {
    try {
      userName = (JSON.parse(userRaw) as { name?: string }).name ?? '';
    } catch {
      userName = '';
    }
  }

  // Not logged in → /login (a 401 mid-session does the same via apiRequest)
  useEffect(() => {
    if (!token) router.replace('/login');
  }, [token, router]);

  // Previous sessions
  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    apiRequest<SessionListItem[] | ApiError>('/sessions', 'GET').then((res) => {
      if (cancelled) return;
      if (res.ok && Array.isArray(res.data)) {
        setSessions(res.data);
      } else {
        setSessions([]);
        setSessionsError(
          (res.data as ApiError | undefined)?.detail ?? res.error ?? 'Could not load sessions.'
        );
      }
    });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const startTeaching = async () => {
    if (starting) return;
    setStarting(true);
    setStartError('');

    const res = await apiRequest<CreateSessionResponse & ApiError>(
      '/sessions/create-from-kb',
      'POST',
      { kb_id: 'demo', count: 2 }
    );
    setStarting(false);

    if (res.ok && res.data?.session_id) {
      router.push(`/session/${res.data.session_id}/chat`);
    } else {
      setStartError(
        res.data?.detail ?? res.error ?? 'Could not start a teaching session. Please try again.'
      );
    }
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
      <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
        <p className="text-lg text-gray-200">
          Welcome{userName ? <>, <strong className="text-white">{userName}</strong></> : ''} —
          teach Nova and help her correct her misconceptions.
        </p>

        {/* ── Start a new teaching session ─────────────────────────────── */}
        <section className="card">
          <h2 className="mb-2 text-lg font-semibold">Start teaching Nova</h2>
          <p className="mb-4 text-sm text-gray-400">
            Creates a fresh Nova with two misconceptions from the demo knowledge base and opens
            the teaching chat.
          </p>

          {startError && (
            <p className="mb-3 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
              {startError}
            </p>
          )}

          <button type="button" className="button" onClick={startTeaching} disabled={starting}>
            {starting ? <span className="spinner" /> : 'Start session'}
          </button>
        </section>

        {/* ── Previous sessions ─────────────────────────────────────────── */}
        <section className="card">
          <h2 className="mb-4 text-lg font-semibold">Previous sessions</h2>

          {sessions === null ? (
            <p className="flex items-center gap-2 text-sm text-gray-400">
              <span className="spinner" /> Loading sessions…
            </p>
          ) : sessionsError ? (
            <p className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
              {sessionsError}
            </p>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-gray-400">
              No sessions yet — start one above and it will show up here.
            </p>
          ) : (
            <ul className="space-y-2">
              {sessions.map((s) => (
                <li
                  key={s.session_id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white/5 px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate text-gray-100">{s.topic || 'Untitled session'}</p>
                    <p className="text-xs text-gray-400">
                      {formatDate(s.created_at)} · learned {s.learned_count} of {s.total_count}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push(`/session/${s.session_id}/chat`)}
                    className="button px-3 py-1.5 text-sm"
                  >
                    Open
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
