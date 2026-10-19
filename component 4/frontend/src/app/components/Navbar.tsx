// app/components/Navbar.tsx
'use client';

import { useSyncExternalStore, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getAccessToken,
  getStoredUserRaw,
  getServerAuthSnapshot,
  logoutRequest,
  subscribeAuth,
} from '../utils/api';

const APP_NAME = 'Teach Nova';

export default function Navbar() {
  const router = useRouter();
  const token = useSyncExternalStore(subscribeAuth, getAccessToken, getServerAuthSnapshot);
  const userRaw = useSyncExternalStore(subscribeAuth, getStoredUserRaw, getServerAuthSnapshot);
  const [loggingOut, setLoggingOut] = useState(false);

  let name = '';
  if (userRaw) {
    try {
      name = (JSON.parse(userRaw) as { name?: string; email?: string }).name ?? '';
    } catch {
      name = '';
    }
  }

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    await logoutRequest();
    router.push('/login');
  };

  return (
    <header className="mb-6 border-b border-white/10 bg-white/5 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <span className="text-base font-semibold tracking-tight text-gray-100">
          {APP_NAME}
        </span>

        {token && (
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-300">
              {name ? (
                <>
                  Signed in as <strong className="text-gray-100">{name}</strong>
                </>
              ) : (
                'Signed in'
              )}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="rounded-md border border-white/15 px-3 py-1.5 text-gray-100 transition hover:bg-white/10 disabled:opacity-60"
            >
              {loggingOut ? 'Logging out…' : 'Logout'}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
