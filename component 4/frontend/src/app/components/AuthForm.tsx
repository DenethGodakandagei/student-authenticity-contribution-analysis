// app/components/AuthForm.tsx
'use client';

import { useState } from 'react';
import { apiRequest, saveAuth, AuthResponse } from '../utils/api';

interface AuthPayload extends AuthResponse {
  detail?: string;
}

type Mode = 'login' | 'register';

export default function AuthForm({ onAuthed }: { onAuthed: () => void }) {
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [studentId, setStudentId] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const path = mode === 'login' ? '/auth/login' : '/auth/register';
    const body =
      mode === 'login'
        ? { email: email.trim(), password }
        : {
            name: name.trim(),
            email: email.trim(),
            password,
            student_id: studentId.trim() || null,
            consent,
          };

    const res = await apiRequest<AuthPayload>(path, 'POST', body);
    setLoading(false);

    if (!res.ok || !res.data?.access_token) {
      const detail =
        res.data?.detail ??
        res.error ??
        (res.status === 401
          ? 'Incorrect email or password'
          : 'Authentication failed. Please try again.');
      setError(detail);
      return;
    }

    saveAuth(res.data);
    onAuthed();
  };

  return (
    <div className="card w-full max-w-md">
      <div className="mb-5 flex gap-2">
        <button
          type="button"
          onClick={() => switchMode('login')}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${
            mode === 'login' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-gray-300'
          }`}
        >
          Log in
        </button>
        <button
          type="button"
          onClick={() => switchMode('register')}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${
            mode === 'register' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-gray-300'
          }`}
        >
          Register
        </button>
      </div>

      <h2 className="mb-4 text-xl">
        {mode === 'login' ? 'Welcome back' : 'Create your account'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === 'register' && (
          <label className="block text-sm">
            <span className="mb-1 block text-gray-300">Name</span>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md bg-gray-900 p-2 text-gray-100"
            />
          </label>
        )}

        <label className="block text-sm">
          <span className="mb-1 block text-gray-300">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md bg-gray-900 p-2 text-gray-100"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-gray-300">Password</span>
          <input
            type="password"
            required
            minLength={mode === 'register' ? 8 : undefined}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md bg-gray-900 p-2 text-gray-100"
          />
        </label>

        {mode === 'register' && (
          <>
            <label className="block text-sm">
              <span className="mb-1 block text-gray-300">Student ID (optional)</span>
              <input
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full rounded-md bg-gray-900 p-2 text-gray-100"
              />
            </label>

            <label className="flex items-start gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                required
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-1"
              />
              I consent to my teaching interactions being stored for analysis.
            </label>
          </>
        )}

        {error && (
          <p className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
            {error}
          </p>
        )}

        <button type="submit" className="button w-full" disabled={loading}>
          {loading ? <span className="spinner" /> : mode === 'login' ? 'Log in' : 'Register'}
        </button>
      </form>
    </div>
  );
}
