// app/lecturer/page.tsx
//
// Role-aware landing page for accounts that chose (or hold) the lecturer role.
// It is a deliberately empty placeholder: lecturer tooling can only be built on
// top of server-side role claims and authorisation, which the backend does not
// expose yet. Nothing here grants, checks or simulates lecturer privileges.
'use client';

import { useEffect, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuthLayout from '../auth/AuthLayout';
import { delay } from '../auth/anim';
import { getAccessToken, getServerAuthSnapshot, subscribeAuth } from '../utils/api';

export default function LecturerPage() {
  const router = useRouter();
  const token = useSyncExternalStore(subscribeAuth, getAccessToken, getServerAuthSnapshot);

  useEffect(() => {
    if (!token) router.replace('/login');
  }, [token, router]);

  if (!token) {
    return (
      <AuthLayout mode="info">
        <p className="auth-sub a-up">Checking your session…</p>
        <span className="spinner" aria-hidden="true" />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout mode="info">
      <header className="auth-head">
        <p className="auth-kicker a-up" style={delay(40)}>
          Lecturer access
        </p>
        <h1 className="auth-title a-up" style={delay(95)}>
          Lecturer workspace
        </h1>
        <p className="auth-sub a-up" style={delay(150)}>
          Learning materials, activity setup and student progress live here once your
          account is granted a lecturer role.
        </p>
      </header>

      <p className="auth-note auth-note--box a-up" style={delay(210)}>
        Lecturer privileges are issued exclusively by the NOVA backend. This screen
        never grants access on its own — until the server returns a lecturer role for
        your account, lecturer tools stay unavailable.
      </p>

      <div className="a-up" style={{ ...delay(270), display: 'grid', gap: '0.75rem' }}>
        <Link className="auth-btn" href="/">
          Back to the student dashboard
        </Link>
        <Link className="auth-btn auth-btn--ghost" href="/login">
          Sign in with another account
        </Link>
      </div>
    </AuthLayout>
  );
}
