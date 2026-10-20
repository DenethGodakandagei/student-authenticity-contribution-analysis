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

const HOME_LINK = {
  href: '/dashboard',
  label: 'Dashboard',
  className: 'auth-nav__link auth-nav__link--home',
} as const;

const AUTH_LINKS = [
  { href: '/login', label: 'Sign in', className: 'auth-nav__link' },
  { href: '/register', label: 'Create account', className: 'auth-nav__link' },
] as const;

/**
 * Top navigation bar shared by every screen. Logo sits on the left. When a user
 * is signed in the Sign in / Create account links are replaced with their name
 * and a Logout button.
 */
export default function AuthNav() {
  const pathname = usePathname();
  const router = useRouter();
  const token = useSyncExternalStore(subscribeAuth, getAccessToken, getServerAuthSnapshot);
  const userRaw = useSyncExternalStore(subscribeAuth, getStoredUserRaw, getServerAuthSnapshot);
  const [loggingOut, setLoggingOut] = useState(false);

  let userName = '';
  let roleBadge = '';
  if (userRaw) {
    try {
      const parsed = JSON.parse(userRaw) as { name?: string; role?: string };
      userName = parsed.name ?? '';
      roleBadge = parsed.role === 'lecturer' ? 'Lecturer' : 'Student';
    } catch {
      userName = '';
    }
  }

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    await logoutRequest();
    router.push('/login');
  };

  return (
    <nav className="auth-nav a-up" style={delay(20)} aria-label="Primary">
      <div className="auth-nav__left">
        <Link className="auth-nav__brand" href="/" aria-label="NOVA — home">
          <NovaLogo size={36} tagline />
        </Link>
      </div>

      <div className="auth-nav__links">
        <Link
          href={HOME_LINK.href}
          className={HOME_LINK.className}
          aria-current={pathname === HOME_LINK.href ? 'page' : undefined}
        >
          {HOME_LINK.label}
        </Link>

        {token ? (
          <>
            <Link
              href="/sessions/new"
              className="auth-nav__link auth-nav__link--action"
              aria-current={pathname === '/sessions/new' ? 'page' : undefined}
            >
              + New session
            </Link>
            {userName && (
              <span className="auth-nav__user">
                <span className="auth-nav__user-name">{userName}</span>
                {roleBadge && (
                  <span className="auth-nav__role-badge" aria-label={`Role: ${roleBadge}`}>
                    {roleBadge}
                  </span>
                )}
              </span>
            )}
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
          AUTH_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`${link.className} ${link.href === '/register' ? 'auth-nav__link--cta' : ''}`}
              aria-current={pathname === link.href ? 'page' : undefined}
            >
              {link.label}
            </Link>
          ))
        )}
      </div>
    </nav>
  );
}
