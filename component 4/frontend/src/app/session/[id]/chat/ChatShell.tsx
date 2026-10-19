// app/session/[id]/chat/ChatShell.tsx
'use client';

import { useEffect, useSyncExternalStore, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import ChatBox, { ChatTurn } from '../../../components/ChatBox';
import ProgressCard from '../../../components/ProgressCard';
import ResearcherPanel from '../../../components/ResearcherPanel';
import {
  apiRequest,
  getAccessToken,
  getServerAuthSnapshot,
  subscribeAuth,
} from '../../../utils/api';
import type {
  DetectionItem,
  SessionState,
  UnderstandingSummary,
} from '../../../utils/types';

export default function ChatShell({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const token = useSyncExternalStore(subscribeAuth, getAccessToken, getServerAuthSnapshot);

  const [summary, setSummary] = useState<UnderstandingSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const [detection, setDetection] = useState<DetectionItem[] | null>(null);

  // Not logged in → back to /login (apiRequest handles token expiry the same way)
  useEffect(() => {
    if (!token) router.replace('/login');
  }, [token, router]);

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

  if (!token) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <span className="spinner" />
      </main>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0">
            <ChatBox sessionId={sessionId} onTurn={handleTurn} />
          </div>

          <aside className="space-y-4 self-start lg:sticky lg:top-6">
            <ProgressCard data={summary} loading={summaryLoading} />
            <ResearcherPanel state={sessionState} detection={detection} />
          </aside>
        </div>
      </main>
    </div>
  );
}
