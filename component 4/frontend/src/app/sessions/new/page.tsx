// app/sessions/new/page.tsx
'use client';

import { FormEvent, useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  apiRequest,
  getAccessToken,
  getServerAuthSnapshot,
  subscribeAuth,
} from '../../utils/api';
import type {
  ApiError,
  CreateNovaResponse,
  CreateSessionResponse,
  UploadMaterialResponse,
} from '../../utils/types';

type Tab = 'kb' | 'pdf' | 'atlas';

interface CreatedSession {
  sessionId: string;
  topic: string;
  detail: string;
}

const SAMPLE_ATLAS = JSON.stringify(
  {
    topic: 'Object Oriented Programming',
    learning_objectives: ['Explain classes, objects and constructors'],
    misconceptions: [
      {
        wrong_concept: 'A constructor destroys the object when it is declared.',
        correct_concept: 'A constructor initializes the object when it is declared.',
        reason: 'The student confuses construction with destruction.',
      },
    ],
  },
  null,
  2
);

const INPUT =
  'mt-1 w-full rounded-lg border border-white/10 bg-gray-950/60 px-3 py-2 text-sm text-gray-100 outline-none placeholder:text-gray-600 focus:border-indigo-400';
const LABEL = 'block text-sm font-medium text-gray-300';
const SECONDARY_BUTTON =
  'inline-flex items-center justify-center rounded-lg border border-white/15 px-3 py-2 text-sm text-gray-200 transition hover:bg-white/10 disabled:opacity-60';

function tabClass(active: boolean): string {
  return `rounded-lg px-3 py-2 text-sm font-medium transition ${
    active
      ? 'bg-indigo-600 text-white'
      : 'border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'
  }`;
}

export default function NewSessionPage() {
  const router = useRouter();
  const token = useSyncExternalStore(subscribeAuth, getAccessToken, getServerAuthSnapshot);

  const [tab, setTab] = useState<Tab>('kb');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<CreatedSession | null>(null);

  const [kbId, setKbId] = useState('demo');
  const [count, setCount] = useState('2');
  const [ids, setIds] = useState('');

  const [file, setFile] = useState<File | null>(null);
  const [atlas, setAtlas] = useState('');

  useEffect(() => {
    if (!token) router.replace('/login');
  }, [token, router]);

  const fail = (res: { data?: unknown; error?: string }, fallback: string) => {
    const detail = (res.data as ApiError | undefined)?.detail;
    setError(detail ?? res.error ?? fallback);
  };

  const createFromKb = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    setCreated(null);

    const pickedIds = ids
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    const payload: Record<string, unknown> = {
      kb_id: kbId.trim(),
      count: Math.max(1, Number(count) || 1),
    };
    if (pickedIds.length > 0) payload.misconception_ids = pickedIds;

    const res = await apiRequest<CreateSessionResponse & ApiError>(
      '/sessions/create-from-kb',
      'POST',
      payload
    );
    setBusy(false);

    if (res.ok && res.data?.session_id) {
      setCreated({
        sessionId: res.data.session_id,
        topic: res.data.state?.topic || 'Nova session',
        detail: 'Created from a knowledge base.',
      });
      return;
    }
    fail(res, 'Could not create a session from that knowledge base.');
  };

  const uploadPdf = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (!file) {
      setError('Choose a PDF file first.');
      return;
    }
    setBusy(true);
    setError('');
    setCreated(null);

    const form = new FormData();
    form.append('file', file);
    const res = await apiRequest<UploadMaterialResponse & ApiError>(
      '/upload-material',
      'POST',
      form
    );
    setBusy(false);

    if (res.ok && res.data?.session_id) {
      setCreated({
        sessionId: res.data.session_id,
        topic: res.data.detected_topic || 'Uploaded lecture',
        detail: `${res.data.number_of_pages} pages · ${res.data.number_of_chunks} chunks · ${res.data.filename}`,
      });
      return;
    }
    fail(res, 'Could not upload and process that PDF.');
  };

  const createFromAtlas = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    setCreated(null);

    let parsed: unknown;
    try {
      parsed = JSON.parse(atlas);
    } catch {
      setBusy(false);
      setError('The Atlas JSON is not valid JSON.');
      return;
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      setBusy(false);
      setError('Atlas JSON must be a single JSON object.');
      return;
    }

    const res = await apiRequest<CreateNovaResponse & ApiError>(
      '/sessions/create-nova',
      'POST',
      { atlas_output: parsed }
    );
    setBusy(false);

    if (res.ok && res.data?.session_id) {
      setCreated({
        sessionId: res.data.session_id,
        topic: res.data.state?.topic || 'Atlas session',
        detail: 'Created directly from Atlas output.',
      });
      return;
    }
    fail(res, 'Could not create a session from that Atlas JSON.');
  };

  if (!token) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <span className="spinner" />
      </main>
    );
  }

  return (
    <div className="min-h-screen">
      <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Create a Nova session</h1>
            <p className="mt-1 text-sm text-gray-400">
              Choose where Nova&apos;s misconceptions come from.
            </p>
          </div>
          <Link href="/dashboard" className={SECONDARY_BUTTON}>
            Back to dashboard
          </Link>
        </div>

        {error && (
          <p
            className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300"
            role="alert"
          >
            {error}
          </p>
        )}

        {created && (
          <section className="card border border-emerald-500/30">
            <h2 className="text-lg font-semibold text-emerald-300">Session created</h2>
            <p className="mt-1 text-sm text-gray-300">{created.topic}</p>
            <p className="mt-0.5 text-xs text-gray-400">{created.detail}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="button"
                onClick={() => router.push(`/session/${created.sessionId}/pretest`)}
              >
                Take the pre-test
              </button>
              <Link
                href={`/session/${created.sessionId}/details`}
                className={SECONDARY_BUTTON}
              >
                View session details
              </Link>
            </div>
          </section>
        )}

        <section className="card">
          <div className="flex flex-wrap gap-2">
            <button type="button" className={tabClass(tab === 'kb')} onClick={() => setTab('kb')}>
              Knowledge base
            </button>
            <button type="button" className={tabClass(tab === 'pdf')} onClick={() => setTab('pdf')}>
              Upload PDF
            </button>
            <button
              type="button"
              className={tabClass(tab === 'atlas')}
              onClick={() => setTab('atlas')}
            >
              Atlas JSON
            </button>
          </div>

          {tab === 'kb' && (
            <form className="mt-5 space-y-4" onSubmit={createFromKb}>
              <p className="text-sm text-gray-400">
                Start from a misconception repository such as <code>demo</code>.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={LABEL}>
                  Knowledge base id
                  <input
                    className={INPUT}
                    value={kbId}
                    onChange={(event) => setKbId(event.target.value)}
                    placeholder="demo"
                    required
                  />
                </label>
                <label className={LABEL}>
                  Number of misconceptions
                  <input
                    className={INPUT}
                    type="number"
                    min={1}
                    value={count}
                    onChange={(event) => setCount(event.target.value)}
                  />
                </label>
              </div>
              <label className={LABEL}>
                Misconception ids (optional, comma-separated)
                <input
                  className={INPUT}
                  value={ids}
                  onChange={(event) => setIds(event.target.value)}
                  placeholder="m1, m3"
                />
              </label>
              <button type="submit" className="button" disabled={busy}>
                {busy ? <span className="spinner" /> : 'Create from knowledge base'}
              </button>
            </form>
          )}

          {tab === 'pdf' && (
            <form className="mt-5 space-y-4" onSubmit={uploadPdf}>
              <p className="text-sm text-gray-400">
                Upload a lecture PDF. Nova&apos;s misconceptions are generated from the
                lecture content.
              </p>
              <label className={LABEL}>
                Lecture PDF
                <input
                  className={`${INPUT} file:mr-3 file:rounded-md file:border-0 file:bg-indigo-600 file:px-3 file:py-1.5 file:text-white`}
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  required
                />
              </label>
              <button type="submit" className="button" disabled={busy}>
                {busy ? <span className="spinner" /> : 'Upload and create session'}
              </button>
            </form>
          )}

          {tab === 'atlas' && (
            <form className="mt-5 space-y-4" onSubmit={createFromAtlas}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-sm text-gray-400">
                  Paste Atlas output with <code>topic</code>, <code>learning_objectives</code>{' '}
                  and <code>misconceptions</code>.
                </p>
                <button
                  type="button"
                  className={SECONDARY_BUTTON}
                  onClick={() => setAtlas(SAMPLE_ATLAS)}
                >
                  Fill with example
                </button>
              </div>
              <textarea
                className={`${INPUT} min-h-[18rem] font-mono`}
                value={atlas}
                onChange={(event) => setAtlas(event.target.value)}
                placeholder={SAMPLE_ATLAS}
                required
              />
              <button type="submit" className="button" disabled={busy}>
                {busy ? <span className="spinner" /> : 'Create from Atlas JSON'}
              </button>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
