// app/dashboard/page.tsx — student dashboard
'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import GreetingCard from '../components/dashboard/GreetingCard';
import NovaAvatarCard from '../components/dashboard/NovaAvatarCard';
import StartTeachingCard from '../components/dashboard/StartTeachingCard';
import SessionsList from '../components/dashboard/SessionsList';
import MaterialsCard from '../components/dashboard/MaterialsCard';
import HowItWorksCard from '../components/dashboard/HowItWorksCard';
import QuizzesList from '../components/dashboard/QuizzesList';
import {
  apiRequest,
  getAccessToken,
  getServerAuthSnapshot,
  getStoredUserRaw,
  subscribeAuth,
} from '../utils/api';
import { useRoleGuard } from '../utils/useRoleGuard';
import type { ApiError, SessionListItem } from '../utils/types';
import '../components/dashboard/dashboard.css';

export default function DashboardPage() {
  const router = useRouter();
  const token = useSyncExternalStore(subscribeAuth, getAccessToken, getServerAuthSnapshot);
  const userRaw = useSyncExternalStore(subscribeAuth, getStoredUserRaw, getServerAuthSnapshot);
  const { ready } = useRoleGuard('student');

  const [sessions, setSessions] = useState<SessionListItem[] | null>(null);
  const [sessionsError, setSessionsError] = useState('');

  let userName = '';
  if (userRaw) {
    try {
      userName = (JSON.parse(userRaw) as { name?: string }).name ?? '';
    } catch {
      userName = '';
    }
  }

  // Fetch sessions once the guard has cleared.
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;

    apiRequest<SessionListItem[] | ApiError>('/sessions', 'GET').then((res) => {
      if (cancelled) return;
      if (res.ok && Array.isArray(res.data)) {
        setSessions(res.data);
      } else {
        setSessions([]);
        setSessionsError(
          (res.data as ApiError | undefined)?.detail ?? res.error ?? 'Could not load your sessions.'
        );
      }
    });

    return () => {
      cancelled = true;
    };
  }, [ready]);

  if (!ready) {
    return (
      <main className="dash-loading">
        <span className="dash-spinner" aria-hidden="true" />
      </main>
    );
  }

  return (
    <div className="dash-page">
      <main className="dash-container">
        <GreetingCard userName={userName} />

        <NovaAvatarCard userName={userName} />

        <div className="dash-grid">
          <StartTeachingCard />
          <HowItWorksCard />
        </div>

        <MaterialsCard />

        <QuizzesList />

        <SessionsList sessions={sessions} error={sessionsError} />
      </main>
    </div>
  );
}
