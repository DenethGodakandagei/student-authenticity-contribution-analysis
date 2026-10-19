// app/components/dashboard/StartTeachingCard.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '../../utils/api';
import type { ApiError, CreateSessionResponse } from '../../utils/types';

export default function StartTeachingCard() {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  const handleStart = async () => {
    if (starting) return;
    setStarting(true);
    setError('');

    const res = await apiRequest<CreateSessionResponse & ApiError>(
      '/sessions/create-from-kb',
      'POST',
      { kb_id: 'demo', count: 2 }
    );
    setStarting(false);

    if (res.ok && res.data?.session_id) {
      router.push(`/session/${res.data.session_id}/chat`);
      return;
    }
    setError(
      res.data?.detail ?? res.error ?? 'Could not start a teaching session. Please try again.'
    );
  };

  return (
    <section className="dash-card">
      <h2 className="dash-card__title">Start teaching Nova</h2>
      <p className="dash-card__text">
        Creates a fresh Nova with two misconceptions from the demo knowledge base and
        opens the teaching chat.
      </p>

      {error && (
        <p className="dash-alert" role="alert">
          {error}
        </p>
      )}

      <button
        type="button"
        className="dash-btn"
        onClick={handleStart}
        disabled={starting}
        aria-busy={starting || undefined}
      >
        {starting && <span className="dash-btn__spinner" aria-hidden="true" />}
        {starting ? 'Starting…' : 'Start session'}
      </button>
    </section>
  );
}
