// app/components/dashboard/DashboardNavbar.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { NovaMark } from '../../auth/NovaLogo';
import { logoutRequest, getStoredUser } from '../../utils/api';
import { destinationFor, type AuthRole } from '../../auth/authService';

export default function DashboardNavbar({ userName }: { userName: string }) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const user = typeof window !== 'undefined' ? getStoredUser() : null;
  const role: AuthRole | undefined =
    (user as { role?: string } | null)?.role === 'lecturer' ? 'lecturer' : 'student';
  const homeHref = destinationFor(role);
  const roleBadge = role === 'lecturer' ? 'Lecturer' : 'Student';

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    await logoutRequest();
    router.push('/login');
  };

  return (
    <header className="dash-nav">
      <div className="dash-nav__inner">
        <Link href={homeHref} className="dash-nav__brand" aria-label="NOVA home">
          <NovaMark size={30} />
          <span className="dash-nav__word">NOVA</span>
        </Link>

        <div className="dash-nav__right">
          {userName && (
            <span className="dash-nav__user">
              {userName}
              <span
                className="dash-nav__role-badge"
                aria-label={`Role: ${roleBadge}`}
              >
                {roleBadge}
              </span>
            </span>
          )}
          <button
            type="button"
            className="dash-nav__logout"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? 'Logging out…' : 'Logout'}
          </button>
        </div>
      </div>
    </header>
  );
}
