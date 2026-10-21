// app/session/[id]/chat/ChatShell.tsx
'use client';

import { useEffect, useSyncExternalStore, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ChatBox, { ChatTurn } from '../../../components/ChatBox';
import ProgressCard from '../../../components/ProgressCard';
import ResearcherPanel from '../../../components/ResearcherPanel';
import {
  apiRequest,
  getAccessToken,
  getServerAuthSnapshot,
  subscribeAuth,
} from '../../../utils/api';
import { useRoleGuard } from '../../../utils/useRoleGuard';
import type {
  ApiError,
  DetectionItem,
  HintResponse,
  SessionState,
  UnderstandingSummary,
} from '../../../utils/types';

export default function ChatShell({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const token = useSyncExternalStore(subscribeAuth, getAccessToken, getServerAuthSnapshot);
  const { ready } = useRoleGuard('student');

  const [summary, setSummary] = useState<UnderstandingSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const [stateLoading, setStateLoading] = useState(true);
  const [stateError, setStateError] = useState('');
  const [detection, setDetection] = useState<DetectionItem[] | null>(null);

  // Progressive Hint States
  const [hintLevel, setHintLevel] = useState<1 | 2 | 3>(1);
  const [currentHint, setCurrentHint] = useState<string | null>(null);
  const [hintConcept, setHintConcept] = useState<string | null>(null);
  const [hintsLeft, setHintsLeft] = useState<number | null>(null);
  const [hintLoading, setHintLoading] = useState(false);
  const [hintError, setHintError] = useState('');
  const [tipsOpen, setTipsOpen] = useState(false);

  // Guard handles redirect — suppress the old manual check.
  useEffect(() => {
    if (!token) router.replace('/login');
  }, [token, router]);

  // Load the session first so old sessions without tests still open safely,
  // and so teaching cannot start before the pre-test is submitted.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    apiRequest<SessionState & ApiError>(`/sessions/${sessionId}`, 'GET').then((res) => {
      if (cancelled) return;
      setStateLoading(false);
      if (res.ok && res.data?.session_id) {
        setSessionState(res.data);
        if (!res.data.tests?.pre?.submitted_at) {
          router.replace(`/session/${sessionId}/pretest`);
        }
      } else {
        setStateError(
          res.data?.detail ?? res.error ?? 'Could not load this session.'
        );
      }
    });

    return () => {
      cancelled = true;
    };
  }, [sessionId, token, router]);

  // Initial progress load; ChatBox turns keep it fresh after every message
  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    apiRequest<UnderstandingSummary>(`/sessions/${sessionId}/summary`, 'GET').then((res) => {
      if (cancelled) return;
      setSummaryLoading(false);
      if (res.ok && res.data?.misconceptions) {
        setSummary(res.data);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [sessionId, token]);

  const handleTurn = (turn: ChatTurn) => {
    if (turn.understanding) setSummary(turn.understanding);
    if (turn.state) setSessionState(turn.state);
    if (turn.detection) setDetection(turn.detection);
    setSummaryLoading(false);

    // Reset hint level & current hint when newly_corrected_ids changes / misconception is solved
    if (turn.newly_corrected_ids && turn.newly_corrected_ids.length > 0) {
      setHintLevel(1);
      setCurrentHint(null);
      setHintConcept(null);
      setHintsLeft(null);
      setHintError('');
    }
  };

  const handleRequestHint = async () => {
    if (hintLoading) return;
    setHintLoading(true);
    setHintError('');

    const res = await apiRequest<HintResponse & ApiError>(
      `/sessions/${sessionId}/hint`,
      'POST',
      { level: hintLevel }
    );
    setHintLoading(false);

    if (res.ok && res.data) {
      setCurrentHint(res.data.hint);
      setHintConcept(res.data.concept);
      setHintsLeft(res.data.hints_left);
      // Increment level for next click up to 3
      if (hintLevel < 3) {
        setHintLevel((prev) => (prev + 1) as 2 | 3);
      }
    } else {
      const errorMsg =
        res.data?.detail ??
        res.error ??
        'Could not fetch a hint. Please try again.';
      setHintError(errorMsg);
    }
  };

  const turnCount = Math.floor((sessionState?.conversation_history.length ?? 0) / 2);
  const postSubmitted = Boolean(sessionState?.tests?.post?.submitted_at);
  const pretestSubmitted = Boolean(sessionState?.tests?.pre?.submitted_at);

  if (!token || stateLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <span className="spinner" />
      </main>
    );
  }

  if (stateError) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <section className="card">
          <h1 className="text-xl font-semibold">Teaching session</h1>
          <p
            className="mt-3 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300"
            role="alert"
          >
            {stateError}
          </p>
        </section>
      </main>
    );
  }

  if (!pretestSubmitted) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <span className="spinner" />
      </main>
    );
  }

  return (
    <div className="min-h-screen">
      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0">
            <ChatBox sessionId={sessionId} onTurn={handleTurn} />
          </div>

          <aside className="space-y-4 self-start lg:sticky lg:top-6">
            {/* Need Help? Card */}
            <section className="card" style={{ border: '1px solid rgba(111, 175, 154, 0.35)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <span
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    background: '#eff8f3',
                    border: '1px solid rgba(111, 175, 154, 0.45)',
                    color: '#3e8b75',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
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
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </span>
                <h2 className="text-lg font-semibold" style={{ margin: 0 }}>Need help?</h2>
              </div>
              <p className="text-xs text-gray-400" style={{ marginBottom: '0.85rem' }}>
                Use these tools if you get stuck explaining a concept to Nova.
              </p>

              {/* Study Guide Link */}
              <a
                href={`/session/${sessionId}/study`}
                target="_blank"
                rel="noopener noreferrer"
                className="button w-full text-center"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.45rem',
                  textDecoration: 'none',
                  fontSize: '0.86rem',
                  padding: '0.55rem 0.9rem',
                }}
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                </svg>
                Open study guide
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ opacity: 0.8 }}
                >
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>

              {/* Progressive Hints Section */}
              <div
                style={{
                  marginTop: '0.9rem',
                  paddingTop: '0.85rem',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                  <span className="text-xs font-semibold text-gray-300">
                    Progressive Hint
                  </span>
                  {hintsLeft !== null && (
                    <span className="text-xs font-medium text-emerald-400">
                      Hints left: {hintsLeft}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  className="button w-full"
                  style={{
                    fontSize: '0.84rem',
                    padding: '0.5rem 0.85rem',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#f5f5f7',
                  }}
                  onClick={handleRequestHint}
                  disabled={hintLoading || hintsLeft === 0}
                  aria-busy={hintLoading || undefined}
                >
                  {hintLoading && <span className="spinner" style={{ marginRight: '0.4rem', width: '0.85rem', height: '0.85rem' }} />}
                  {hintLoading
                    ? 'Thinking…'
                    : currentHint
                    ? `Next hint (Level ${Math.min(hintLevel, 3)})`
                    : 'Give me a hint'}
                </button>

                {hintError && (
                  <p
                    className="mt-2 rounded-md border border-rose-500/40 bg-rose-500/10 px-2.5 py-1.5 text-xs text-rose-300"
                    role="alert"
                  >
                    {hintError}
                  </p>
                )}

                {currentHint && !hintError && (
                  <div
                    style={{
                      marginTop: '0.65rem',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '10px',
                      background: 'rgba(111, 175, 154, 0.12)',
                      border: '1px solid rgba(111, 175, 154, 0.35)',
                      fontSize: '0.82rem',
                      lineHeight: 1.5,
                      color: '#eff8f3',
                    }}
                  >
                    {hintConcept && (
                      <p style={{ margin: '0 0 0.25rem', fontWeight: 700, fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#6faf9a' }}>
                        Concept: {hintConcept}
                      </p>
                    )}
                    <p style={{ margin: 0 }}>{currentHint}</p>
                  </div>
                )}
              </div>

              {/* Collapsible Teaching Tips */}
              <div
                style={{
                  marginTop: '0.9rem',
                  paddingTop: '0.85rem',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <button
                  type="button"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    color: 'inherit',
                  }}
                  onClick={() => setTipsOpen((prev) => !prev)}
                  aria-expanded={tipsOpen}
                >
                  <span className="text-xs font-semibold text-gray-300">
                    How to teach Nova
                  </span>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      transform: tipsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                      opacity: 0.7,
                    }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {tipsOpen && (
                  <ul
                    style={{
                      margin: '0.65rem 0 0',
                      paddingLeft: '1.15rem',
                      fontSize: '0.8rem',
                      lineHeight: 1.55,
                      color: 'var(--text-secondary, #9ca3af)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.35rem',
                    }}
                  >
                    <li>
                      <strong className="text-gray-200">Use an everyday analogy:</strong> Compare the technical concept to real life (like blueprints and houses).
                    </li>
                    <li>
                      <strong className="text-gray-200">Give a tiny example:</strong> Write 2-3 lines of code showing how it works.
                    </li>
                    <li>
                      <strong className="text-gray-200">Ask Nova to repeat back:</strong> Prompt her to explain what she understood in her own words.
                    </li>
                  </ul>
                )}
              </div>
            </section>

            <section className="card">
              <h2 className="text-lg font-semibold">Finish teaching</h2>
              <p className="mt-1 text-sm text-gray-400">
                {turnCount === 0
                  ? 'Teach Nova for at least one turn to unlock the post-test.'
                  : `${turnCount} teaching ${turnCount === 1 ? 'turn' : 'turns'} completed.`}
              </p>
              <button
                type="button"
                className="button mt-3 w-full disabled:opacity-50"
                onClick={() =>
                  router.push(
                    postSubmitted
                      ? `/session/${sessionId}/report`
                      : `/session/${sessionId}/posttest`
                  )
                }
                disabled={!postSubmitted && turnCount < 1}
              >
                {postSubmitted ? 'View learning report' : 'Finish & take post-test'}
              </button>
              <Link
                href={`/session/${sessionId}/details`}
                className="mt-2 block text-center text-sm text-indigo-300 hover:underline"
              >
                Session details and tools
              </Link>
            </section>

            <ProgressCard data={summary} loading={summaryLoading} />
            <ResearcherPanel state={sessionState} detection={detection} />
          </aside>
        </div>
      </main>
    </div>
  );
}
