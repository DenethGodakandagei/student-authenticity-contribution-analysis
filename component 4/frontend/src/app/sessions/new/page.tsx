// app/sessions/new/page.tsx
'use client';

import { FormEvent, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  apiRequest,
  getAccessToken,
  getServerAuthSnapshot,
  subscribeAuth,
} from '../../utils/api';
import { useRoleGuard } from '../../utils/useRoleGuard';
import type {
  ApiError,
  CreateNovaResponse,
  CreateSessionResponse,
  UploadMaterialResponse,
} from '../../utils/types';
import '../../components/dashboard/dashboard.css';
import './new-session.css';

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

export default function NewSessionPage() {
  const router = useRouter();
  const token = useSyncExternalStore(subscribeAuth, getAccessToken, getServerAuthSnapshot);
  const { ready } = useRoleGuard('student');

  const [tab, setTab] = useState<Tab>('kb');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<CreatedSession | null>(null);

  const [kbId, setKbId] = useState('demo');
  const [count, setCount] = useState('2');
  const [ids, setIds] = useState('');

  const [file, setFile] = useState<File | null>(null);
  const [atlas, setAtlas] = useState('');
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  if (!ready) {
    return (
      <main className="dash-loading">
        <span className="dash-spinner" aria-hidden="true" />
      </main>
    );
  }

  return (
    <div className="new-session-page dash-page">
      <main className="dash-container">
        {/* Header section */}
        <section className="dash-card">
          <div className="new-session-header">
            <div>
              <div className="new-session-badge">
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
                Session Creator
              </div>
              <h1 className="dash-greeting__title">Create a Nova session</h1>
              <p className="dash-greeting__text">
                Configure your teaching environment. Choose where Nova&apos;s initial misconceptions come from.
              </p>
            </div>
            <Link href="/dashboard" className="dash-btn dash-btn--sm">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
              Back to dashboard
            </Link>
          </div>
        </section>

        {/* Error notification */}
        {error && (
          <div className="dash-alert" role="alert">
            <strong>Error: </strong>
            {error}
          </div>
        )}

        {/* Success / Created card */}
        {created && (
          <section className="new-session-success">
            <div className="new-session-success__header">
              <span className="new-session-success__icon" aria-hidden="true">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </span>
              <h2 className="new-session-success__title">Session Ready!</h2>
            </div>
            <p className="new-session-success__topic">{created.topic}</p>
            <p className="new-session-success__detail">{created.detail}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem' }}>
              <button
                type="button"
                className="dash-btn"
                onClick={() => router.push(`/session/${created.sessionId}/pretest`)}
              >
                Take the pre-test
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
              <Link
                href={`/session/${created.sessionId}/details`}
                className="dash-btn dash-btn--sm"
              >
                View session details
              </Link>
            </div>
          </section>
        )}

        {/* Configuration Card with Tabs */}
        <section className="dash-card">
          <h2 className="dash-card__title">Source Configuration</h2>
          <p className="dash-card__text">
            Select a source to seed Nova&apos;s learner state with targeted concept misconceptions.
          </p>

          <div className="new-session-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'kb'}
              className={`new-session-tab ${tab === 'kb' ? 'is-active' : ''}`}
              onClick={() => setTab('kb')}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                <path d="M6 6h10" />
                <path d="M6 10h10" />
              </svg>
              Knowledge Base
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'pdf'}
              className={`new-session-tab ${tab === 'pdf' ? 'is-active' : ''}`}
              onClick={() => setTab('pdf')}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              Upload PDF
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'atlas'}
              className={`new-session-tab ${tab === 'atlas' ? 'is-active' : ''}`}
              onClick={() => setTab('atlas')}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
              Atlas JSON
            </button>
          </div>

          {tab === 'kb' && (
            <form onSubmit={createFromKb} className="new-session-form">
              <div className="new-session-info-callout">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#3e8b75"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ flexShrink: 0, marginTop: '2px' }}
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4" />
                  <path d="M12 8h.01" />
                </svg>
                <span>
                  Start from an established misconception repository such as <code>demo</code>, or an uploaded material ID.
                </span>
              </div>

              <div className="new-session-form-grid">
                <label className="new-session-field">
                  <span className="dash-field__label">Knowledge Base ID</span>
                  <input
                    className="new-session-input"
                    value={kbId}
                    onChange={(event) => setKbId(event.target.value)}
                    placeholder="e.g. demo"
                    required
                  />
                  <span className="new-session-field__hint">The repository identifier or KB name</span>
                </label>

                <label className="new-session-field">
                  <span className="dash-field__label">Number of Misconceptions</span>
                  <input
                    className="new-session-input"
                    type="number"
                    min={1}
                    value={count}
                    onChange={(event) => setCount(event.target.value)}
                  />
                  <span className="new-session-field__hint">Number of concepts Nova should start with</span>
                </label>

                <label className="new-session-field new-session-field-full">
                  <span className="dash-field__label">
                    Misconception IDs
                    <span style={{ fontWeight: 500, fontSize: '0.72rem', textTransform: 'none', color: 'var(--d-muted)' }}>
                      Optional · comma-separated
                    </span>
                  </span>
                  <input
                    className="new-session-input"
                    value={ids}
                    onChange={(event) => setIds(event.target.value)}
                    placeholder="e.g. m1, m3"
                  />
                  <span className="new-session-field__hint">Leave blank to randomly sample misconceptions</span>
                </label>
              </div>

              <div>
                <button type="submit" className="dash-btn" disabled={busy} aria-busy={busy || undefined}>
                  {busy && <span className="dash-btn__spinner" aria-hidden="true" />}
                  {busy ? 'Creating Session…' : 'Create from Knowledge Base'}
                </button>
              </div>
            </form>
          )}

          {tab === 'pdf' && (
            <form onSubmit={uploadPdf} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="new-session-info-callout">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#3e8b75"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ flexShrink: 0, marginTop: '2px' }}
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4" />
                  <path d="M12 8h.01" />
                </svg>
                <span>
                  Upload a lecture or textbook PDF. Nova&apos;s misconceptions and syllabus topics will be extracted automatically from the lecture material.
                </span>
              </div>

              <div className="dash-field" style={{ margin: 0 }}>
                <span className="dash-field__label">Lecture PDF File</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  style={{ display: 'none' }}
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                />
                <div
                  className={`new-session-file-drop ${file ? 'has-file' : ''} ${dragging ? 'is-dragging' : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setDragging(false);
                    const dropped = event.dataTransfer.files?.[0];
                    if (dropped) setFile(dropped);
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                >
                  <div className="new-session-file-drop__icon">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </div>
                  <div>
                    <p style={{ margin: '0 0 0.25rem', fontWeight: 600, color: '#0d1110', fontSize: '0.94rem' }}>
                      {file ? file.name : 'Click to select or drag a PDF document here'}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--d-muted)' }}>
                      {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB • Ready to upload` : 'Supports PDF files up to 25MB'}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <button type="submit" className="dash-btn" disabled={busy || !file} aria-busy={busy || undefined}>
                  {busy && <span className="dash-btn__spinner" aria-hidden="true" />}
                  {busy ? 'Processing & Creating Session…' : 'Upload and Create Session'}
                </button>
              </div>
            </form>
          )}

          {tab === 'atlas' && (
            <form onSubmit={createFromAtlas} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                <p className="dash-card__text" style={{ margin: 0 }}>
                  Paste custom Atlas output with <code>topic</code>, <code>learning_objectives</code>, and <code>misconceptions</code>.
                </p>
                <button
                  type="button"
                  className="dash-btn dash-btn--sm"
                  onClick={() => setAtlas(SAMPLE_ATLAS)}
                >
                  Fill with example
                </button>
              </div>

              <label className="dash-field" style={{ margin: 0 }}>
                <span className="dash-field__label">Atlas Output JSON</span>
                <textarea
                  className="new-session-textarea"
                  value={atlas}
                  onChange={(event) => setAtlas(event.target.value)}
                  placeholder={SAMPLE_ATLAS}
                  required
                />
              </label>

              <div>
                <button type="submit" className="dash-btn" disabled={busy} aria-busy={busy || undefined}>
                  {busy && <span className="dash-btn__spinner" aria-hidden="true" />}
                  {busy ? 'Creating Session…' : 'Create from Atlas JSON'}
                </button>
              </div>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
