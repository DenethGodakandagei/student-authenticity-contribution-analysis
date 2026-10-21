// app/components/dashboard/StartTeachingCard.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiRequest } from '../../utils/api';
import type {
  ApiError,
  CreateSessionResponse,
  MaterialSummary,
} from '../../utils/types';

const DEMO_MATERIAL: Pick<MaterialSummary, 'kb_id' | 'name' | 'state'> = {
  kb_id: 'demo',
  name: 'Demo knowledge base',
  state: 'ready',
};

function apiError(data: unknown, fallback: string): string {
  return (data as ApiError | undefined)?.detail ?? fallback;
}

interface StartTeachingCardProps {
  onTeachNow?: () => void;
}

export default function StartTeachingCard({ onTeachNow }: StartTeachingCardProps = {}) {
  const router = useRouter();
  const [materials, setMaterials] = useState<MaterialSummary[]>([]);
  const [selectedKbId, setSelectedKbId] = useState('demo');
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    apiRequest<MaterialSummary[] | ApiError>('/materials', 'GET').then((res) => {
      if (cancelled) return;
      if (res.ok && Array.isArray(res.data)) {
        setMaterials(res.data);
        return;
      }
      setError(
        apiError(res.data, res.error ?? 'Could not load your knowledge bases.')
      );
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const options =
    materials.length === 0
      ? [DEMO_MATERIAL]
      : materials.some((material) => material.kb_id === 'demo')
        ? materials
        : [DEMO_MATERIAL, ...materials];
  const selected = options.find((material) => material.kb_id === selectedKbId);

  const handleStart = async () => {
    if (starting || !selectedKbId) return;
    setStarting(true);
    setError('');

    const res = await apiRequest<CreateSessionResponse & ApiError>(
      '/sessions/create-from-kb',
      'POST',
      { kb_id: selectedKbId, count: 2 }
    );
    setStarting(false);

    if (res.ok && res.data?.session_id) {
      router.push(`/session/${res.data.session_id}/pretest`);
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
        Creates a fresh Nova with two misconceptions from the selected knowledge base and
        opens the pre-test before the teaching chat.
      </p>

      {error && (
        <p className="dash-alert" role="alert">
          {error}
        </p>
      )}

      <label className="dash-field">
        <span className="dash-field__label">Knowledge base</span>
        <select
          className="dash-select"
          value={selectedKbId}
          onChange={(event) => setSelectedKbId(event.target.value)}
          disabled={starting}
        >
          {options.map((material) => (
            <option
              key={material.kb_id}
              value={material.kb_id}
              disabled={material.state !== 'ready'}
            >
              {material.name}
              {material.state !== 'ready' ? ` (${material.state})` : ''}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-wrap items-center gap-2">
        {onTeachNow && (
          <button
            type="button"
            className="dash-btn"
            onClick={onTeachNow}
          >
            Teach Now
          </button>
        )}
        <button
          type="button"
          className="dash-btn dash-btn--sm"
          onClick={() => void handleStart()}
          disabled={starting || selected?.state !== 'ready'}
          aria-busy={starting || undefined}
        >
          {starting && <span className="dash-btn__spinner" aria-hidden="true" />}
          {starting ? 'Starting…' : 'Start with ready KB'}
        </button>
        <Link href="/sessions/new" className="dash-btn dash-btn--sm">
          More options
        </Link>
      </div>
    </section>
  );
}
