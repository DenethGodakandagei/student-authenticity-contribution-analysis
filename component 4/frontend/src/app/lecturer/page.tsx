// app/lecturer/page.tsx — placeholder landing page for lecturer accounts
'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import {
  getAccessToken,
  getServerAuthSnapshot,
  logoutRequest,
  subscribeAuth,
} from '../utils/api';
import '../components/dashboard/dashboard.css';

export default function LecturerPage() {
  const router = useRouter();
  const token = useSyncExternalStore(subscribeAuth, getAccessToken, getServerAuthSnapshot);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (!token) router.replace('/login');
  }, [token, router]);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    await logoutRequest();
    router.push('/login');
  };

  if (!token) {
    return (
      <main className="dash-loading">
        <span className="dash-spinner" aria-hidden="true" />
      </main>
    );
  }

  return (
    <div className="dash-page">
      <main className="dash-container">
        <section className="dash-card">
          <h1 className="dash-greeting__title">Lecturer dashboard coming soon</h1>
          <p className="dash-greeting__text">
            Lecturer tools are on the way. You are signed in and can log out below.
          </p>
          <button
            type="button"
            className="dash-nav__logout"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? 'Logging out…' : 'Logout'}
          </button>
        </section>
      </main>
    </div>
  );
}
