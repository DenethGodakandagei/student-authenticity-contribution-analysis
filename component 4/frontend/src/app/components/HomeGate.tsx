// app/components/HomeGate.tsx
'use client';

import { useState } from 'react';
import UploadForm from './UploadForm';
import AuthForm from './AuthForm';
import { clearAuth, getAccessToken, getStoredUser, AuthUser } from '../utils/api';

/**
 * Client-only auth gate: renders the login/register form until a token is
 * stored, then the lecture upload flow. Never server-rendered (loaded through
 * `next/dynamic` with `ssr: false`), so reading localStorage here is safe.
 */
export default function HomeGate() {
  const [token, setToken] = useState<string | null>(() => getAccessToken());
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());

  if (!token) {
    return (
      <AuthForm
        onAuthed={() => {
          setToken(getAccessToken());
          setUser(getStoredUser());
        }}
      />
    );
  }

  const logout = () => {
    clearAuth();
    setToken(null);
    setUser(null);
  };

  return (
    <div className="w-full max-w-md">
      <div className="mb-4 flex items-center justify-between text-sm text-gray-300">
        <span>
          Signed in as <strong className="text-gray-100">{user?.name || user?.email}</strong>
        </span>
        <button type="button" onClick={logout} className="text-indigo-300 hover:text-indigo-200">
          Log out
        </button>
      </div>
      <UploadForm />
    </div>
  );
}
