// app/lecturer/page.tsx — placeholder landing page for lecturer accounts
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { logoutRequest } from '../utils/api';
import { useRoleGuard } from '../utils/useRoleGuard';
import '../components/dashboard/dashboard.css';

export default function LecturerPage() {
  const router = useRouter();
  const { ready } = useRoleGuard('lecturer');
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    await logoutRequest();
    router.push('/login');
  };

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
