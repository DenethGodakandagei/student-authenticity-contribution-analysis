// app/auth/AuthNav.tsx
'use client';

import { useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import NovaLogo from './NovaLogo';
import { delay } from './anim';
import {
  getAccessToken,
  getServerAuthSnapshot,
  getStoredUserRaw,
  logoutRequest,
  subscribeAuth,
} from '../utils/api';

/**
 * Top navigation bar shared across all screens.
 * - When not logged in: displays "Dashboard" and "Sign in".
 * - When logged in: displays "Profile" and "Logout".
 */
export default function AuthNav() {
  const pathname = usePathname();
  const router = useRouter();
  const token = useSyncExternalStore(subscribeAuth, getAccessToken, getServerAuthSnapshot);
  const userRaw = useSyncExternalStore(subscribeAuth, getStoredUserRaw, getServerAuthSnapshot);
  const [loggingOut, setLoggingOut] = useState(false);

  let isLecturer = false;
  if (userRaw) {
    try {
      const parsed = JSON.parse(userRaw) as { role?: string };
      isLecturer = parsed.role === 'lecturer';
    } catch {
      isLecturer = false;
    }
  }

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    await logoutRequest();
    router.push('/login');
  };

  const dashboardHref = isLecturer ? '/lecturer' : '/dashboard';

  return (
    <nav className="auth-nav a-up" style={delay(20)} aria-label="Primary">
      <div className="auth-nav__left">
        <Link className="auth-nav__brand" href="/" aria-label="NOVA — home">
          <NovaLogo size={36} tagline />
        </Link>
      </div>

      <div className="auth-nav__links">
        {token ? (
          <>
            <Link
              href="/profile"
              className="auth-nav__link"
              aria-current={pathname === '/profile' ? 'page' : undefined}
            >
              Profile
            </Link>

            <button
              type="button"
              className="auth-nav__link auth-nav__logout-btn"
              onClick={handleLogout}
              disabled={loggingOut}
            >
              {loggingOut ? 'Logging out…' : 'Logout'}
            </button>
          </>
        ) : (
          <>
            <Link
              href={dashboardHref}
              className="auth-nav__link auth-nav__link--home"
              aria-current={pathname === dashboardHref ? 'page' : undefined}
            >
              Dashboard
            </Link>

            <Link
              href="/register"
              className="auth-nav__link auth-nav__link--cta"
              aria-current={pathname === '/register' || pathname === '/login' ? 'page' : undefined}
            >
              Sign in
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
