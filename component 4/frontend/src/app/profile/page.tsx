// app/profile/page.tsx — Student & Lecturer Profile Page
'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  apiRequest,
  getAccessToken,
  getServerAuthSnapshot,
  getStoredUserRaw,
  logoutRequest,
  subscribeAuth,
} from '../utils/api';
import { useRoleGuard } from '../utils/useRoleGuard';
import StartTeachingCard from '../components/dashboard/StartTeachingCard';
import MaterialsCard from '../components/dashboard/MaterialsCard';
import QuizzesList from '../components/dashboard/QuizzesList';
import SessionsList from '../components/dashboard/SessionsList';
import type { ApiError, SessionListItem } from '../utils/types';
import '../components/dashboard/dashboard.css';

interface UserProfile {
  id?: string;
  name?: string;
  email?: string;
  role?: 'student' | 'lecturer';
  student_id?: string;
  anonymous_id?: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const token = useSyncExternalStore(subscribeAuth, getAccessToken, getServerAuthSnapshot);
  const userRaw = useSyncExternalStore(subscribeAuth, getStoredUserRaw, getServerAuthSnapshot);
  const { ready } = useRoleGuard();

  const [sessions, setSessions] = useState<SessionListItem[] | null>(null);
  const [sessionsError, setSessionsError] = useState('');

  let user: UserProfile | null = null;
  if (userRaw) {
    try {
      user = JSON.parse(userRaw) as UserProfile;
    } catch {
      user = null;
    }
  }

  const loadSessions = () => {
    apiRequest<SessionListItem[] | ApiError>('/sessions', 'GET').then((res) => {
      if (res.ok && Array.isArray(res.data)) {
        setSessions(res.data);
      } else {
        setSessions([]);
        setSessionsError(
          (res.data as ApiError | undefined)?.detail ?? res.error ?? 'Could not load your sessions.'
        );
      }
    });
  };

  useEffect(() => {
    if (!ready || user?.role === 'lecturer') return;
    loadSessions();
  }, [ready, user?.role]);

  const handleLogout = async () => {
    await logoutRequest();
    router.push('/login');
  };

  if (!ready || !user) {
    return (
      <main className="dash-loading">
        <span className="dash-spinner" aria-hidden="true" />
      </main>
    );
  }

  const isLecturer = user.role === 'lecturer';
  const roleDisplay = isLecturer ? 'Lecturer' : 'Student';
  const dashboardHref = isLecturer ? '/lecturer' : '/dashboard';

  return (
    <div className="dash-page">
      <main className={isLecturer ? 'dash-container' : 'profile-container'}>
        <div className={!isLecturer ? 'profile-top-grid' : ''}>
          {/* Account Profile Card */}
          <section className="dash-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.2rem 0.65rem',
                    borderRadius: '999px',
                    background: 'rgba(111, 175, 154, 0.18)',
                    color: 'var(--d-cyan)',
                    fontSize: '0.74rem',
                    fontWeight: 650,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    marginBottom: '0.4rem',
                  }}
                >
                  {roleDisplay} Profile
                </div>
                <h1 className="dash-greeting__title">{user.name || 'User Profile'}</h1>
                <p className="dash-greeting__text">
                  Your authenticated account details on the Nova learning platform.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Link href={dashboardHref} className="dash-btn dash-btn--sm">
                  Back to {roleDisplay} Space
                </Link>
                <button
                  type="button"
                  className="dash-btn dash-btn--sm"
                  style={{ background: '#b4443c', borderColor: '#b4443c' }}
                  onClick={handleLogout}
                >
                  Sign out
                </button>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '0.85rem',
                background: 'rgba(239, 248, 243, 0.5)',
                border: '1px solid rgba(111, 175, 154, 0.3)',
                borderRadius: '16px',
                padding: '1.15rem 1.35rem',
              }}
            >
              <div>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--d-muted)', display: 'block' }}>Full Name:</span>
                <span style={{ fontSize: '0.92rem', fontWeight: 650, color: 'var(--d-ink)' }}>{user.name}</span>
              </div>

              <div>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--d-muted)', display: 'block' }}>Email Address:</span>
                <span style={{ fontSize: '0.92rem', color: 'var(--d-ink)' }}>{user.email || '—'}</span>
              </div>

              <div>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--d-muted)', display: 'block' }}>Role:</span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '6px',
                    background: isLecturer ? 'rgba(30, 77, 62, 0.15)' : 'rgba(111, 175, 154, 0.25)',
                    color: isLecturer ? '#1e4d3e' : '#2b7a63',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    width: 'fit-content',
                  }}
                >
                  {roleDisplay}
                </span>
              </div>

              {user.student_id && (
                <div>
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--d-muted)', display: 'block' }}>Student ID:</span>
                  <span style={{ fontSize: '0.92rem', color: 'var(--d-ink)' }}>{user.student_id}</span>
                </div>
              )}

              {user.anonymous_id && (
                <div>
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--d-muted)', display: 'block' }}>Research Alias:</span>
                  <span style={{ fontSize: '0.84rem', fontFamily: 'monospace', color: 'var(--d-cyan)' }}>
                    {user.anonymous_id}
                  </span>
                </div>
              )}
            </div>
          </section>

          {!isLecturer && (
            <StartTeachingCard />
          )}
        </div>

        {!isLecturer && (
          <div className="profile-bottom-grid">
            {/* Left Column: Your sessions */}
            <div>
              <SessionsList sessions={sessions} error={sessionsError} />
            </div>

            {/* Right Column: Quizzes & Materials */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              <QuizzesList />
              <MaterialsCard />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
