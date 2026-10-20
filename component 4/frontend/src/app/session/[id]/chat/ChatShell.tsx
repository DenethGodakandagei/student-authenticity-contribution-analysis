// app/session/[id]/chat/ChatShell.tsx
'use client';

import { useEffect, useSyncExternalStore, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ChatBox, { ChatTurn } from '../../../components/ChatBox';
import ProgressCard from '../../../components/ProgressCard';
import ResearcherPanel from '../../../components/ResearcherPanel';
import {
  apiRequest,
  getAccessToken,
  getServerAuthSnapshot,
  subscribeAuth,
} from '../../../utils/api';
import { useRoleGuard } from '../../../utils/useRoleGuard';
import type {
  ApiError,
  DetectionItem,
  SessionState,
  UnderstandingSummary,
} from '../../../utils/types';

export default function ChatShell({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const token = useSyncExternalStore(subscribeAuth, getAccessToken, getServerAuthSnapshot);
  const { ready } = useRoleGuard('student');

  const [summary, setSummary] = useState<UnderstandingSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const [stateLoading, setStateLoading] = useState(true);
  const [stateError, setStateError] = useState('');
  const [detection, setDetection] = useState<DetectionItem[] | null>(null);

  // Guard handles redirect — suppress the old manual check.
  useEffect(() => {
    if (!token) router.replace('/login');
  }, [token, router]);

  // Load the session first so old sessions without tests still open safely,
  // and so teaching cannot start before the pre-test is submitted.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    apiRequest<SessionState & ApiError>(`/sessions/${sessionId}`, 'GET').then((res) => {
      if (cancelled) return;
      setStateLoading(false);
      if (res.ok && res.data?.session_id) {
        setSessionState(res.data);
        if (!res.data.tests?.pre?.submitted_at) {
          router.replace(`/session/${sessionId}/pretest`);
        }
      } else {
        setStateError(
          res.data?.detail ?? res.error ?? 'Could not load this session.'
        );
      }
    });

    return () => {
      cancelled = true;
    };
  }, [sessionId, token, router]);

  // Initial progress load; ChatBox turns keep it fresh after every message
  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    apiRequest<UnderstandingSummary>(`/sessions/${sessionId}/summary`, 'GET').then((res) => {
      if (cancelled) return;
      setSummaryLoading(false);
      if (res.ok && res.data?.misconceptions) {
        setSummary(res.data);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [sessionId, token]);

  const handleTurn = (turn: ChatTurn) => {
    if (turn.understanding) setSummary(turn.understanding);
    if (turn.state) setSessionState(turn.state);
    if (turn.detection) setDetection(turn.detection);
    setSummaryLoading(false);
  };

  const turnCount = Math.floor((sessionState?.conversation_history.length ?? 0) / 2);
  const postSubmitted = Boolean(sessionState?.tests?.post?.submitted_at);
  const pretestSubmitted = Boolean(sessionState?.tests?.pre?.submitted_at);

  if (!token || stateLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <span className="spinner" />
      </main>
    );
  }

  if (stateError) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <section className="card">
          <h1 className="text-xl font-semibold">Teaching session</h1>
          <p
            className="mt-3 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300"
            role="alert"
          >
            {stateError}
          </p>
        </section>
      </main>
    );
  }

  if (!pretestSubmitted) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <span className="spinner" />
      </main>
    );
  }

  return (
    <div className="min-h-screen">
      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0">
            <ChatBox sessionId={sessionId} onTurn={handleTurn} />
          </div>

          <aside className="space-y-4 self-start lg:sticky lg:top-6">
            <section className="card">
              <h2 className="text-lg font-semibold">Finish teaching</h2>
              <p className="mt-1 text-sm text-gray-400">
                {turnCount === 0
                  ? 'Teach Nova for at least one turn to unlock the post-test.'
                  : `${turnCount} teaching ${turnCount === 1 ? 'turn' : 'turns'} completed.`}
              </p>
              <button
                type="button"
                className="button mt-3 w-full disabled:opacity-50"
                onClick={() =>
                  router.push(
                    postSubmitted
                      ? `/session/${sessionId}/report`
                      : `/session/${sessionId}/posttest`
                  )
                }
                disabled={!postSubmitted && turnCount < 1}
              >
                {postSubmitted ? 'View learning report' : 'Finish & take post-test'}
              </button>
              <Link
                href={`/session/${sessionId}/details`}
                className="mt-2 block text-center text-sm text-indigo-300 hover:underline"
              >
                Session details and tools
              </Link>
            </section>

            <ProgressCard data={summary} loading={summaryLoading} />
            <ResearcherPanel state={sessionState} detection={detection} />
          </aside>
        </div>
      </main>
    </div>
  );
}
