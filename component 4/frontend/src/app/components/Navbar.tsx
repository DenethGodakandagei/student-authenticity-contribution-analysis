// app/components/Navbar.tsx
'use client';

import { useSyncExternalStore, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getAccessToken,
  getStoredUserRaw,
  getServerAuthSnapshot,
  logoutRequest,
  subscribeAuth,
} from '../utils/api';
import { destinationFor, type AuthRole } from '../auth/authService';

const APP_NAME = 'Teach Nova';

export default function Navbar() {
  const router = useRouter();
  const token = useSyncExternalStore(subscribeAuth, getAccessToken, getServerAuthSnapshot);
  const userRaw = useSyncExternalStore(subscribeAuth, getStoredUserRaw, getServerAuthSnapshot);
  const [loggingOut, setLoggingOut] = useState(false);

  let name = '';
  let role: AuthRole = 'student';
  if (userRaw) {
    try {
      const parsed = JSON.parse(userRaw) as { name?: string; role?: string };
      name = parsed.name ?? '';
      role = parsed.role === 'lecturer' ? 'lecturer' : 'student';
    } catch {
      name = '';
    }
  }

  const homeHref = token ? destinationFor(role) : '/';
  const roleBadge = role === 'lecturer' ? 'Lecturer' : 'Student';

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    await logoutRequest();
    router.push('/login');
  };

  return (
    <header className="mb-6 border-b border-[#6FAF9A]/30 bg-[#EFF8F3]/90 backdrop-blur shadow-sm">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link
          href={homeHref}
          className="text-base font-bold tracking-tight text-[#0D1110] hover:text-[#6FAF9A] transition-colors"
        >
          {APP_NAME}
        </Link>

        {token && (
          <div className="flex items-center gap-4 text-sm">
            <span className="text-[#0D1110]">
              {name ? (
                <>
                  Signed in as{' '}
                  <strong className="text-[#0D1110]">{name}</strong>
                  <span
                    className="ml-2 rounded-full bg-[#6FAF9A] px-2.5 py-0.5 text-xs font-semibold text-[#FFFFFF]"
                    aria-label={`Role: ${roleBadge}`}
                  >
                    {roleBadge}
                  </span>
                </>
              ) : (
                'Signed in'
              )}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="rounded-lg border border-[#0D1110]/20 bg-[#FFFFFF] px-3.5 py-1.5 text-xs font-semibold text-[#0D1110] transition hover:bg-[#0D1110] hover:text-[#FFFFFF] disabled:opacity-60 shadow-xs"
            >
              {loggingOut ? 'Logging out…' : 'Logout'}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
