// app/session/[id]/chat/ChatShell.tsx
'use client';

import { useEffect, useSyncExternalStore, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  apiRequest,
  getAccessToken,
  getServerAuthSnapshot,
  subscribeAuth,
} from '../../../utils/api';
import { useRoleGuard } from '../../../utils/useRoleGuard';
import type {
  ApiError,
  ChatResponse,
  MisconceptionState,
  SessionState,
} from '../../../utils/types';

import '../../../components/dashboard/dashboard.css';
import './chat.css';
import './teachingWorkspace.css';

interface Message {
  role: 'teacher' | 'nova';
  content: string;
}

function normalizeRole(role: string): 'teacher' | 'nova' {
  return role === 'user' ? 'teacher' : (role as 'teacher' | 'nova');
}

export default function ChatShell({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const token = useSyncExternalStore(subscribeAuth, getAccessToken, getServerAuthSnapshot);
  const { ready } = useRoleGuard('student');

  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Active Thought Deck carousel state
  const [activeThoughtIndex, setActiveThoughtIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'thoughts' | 'notes'>('thoughts');

  // Chat message & input state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [markingCorrect, setMarkingCorrect] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Authentication guard
  useEffect(() => {
    if (!token) router.replace('/login');
  }, [token, router]);

  // Load session state & conversation history
  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    const loadSession = async () => {
      setLoading(true);
      setError('');
      const res = await apiRequest<SessionState & ApiError>(`/sessions/${sessionId}`, 'GET');
      if (cancelled) return;
      setLoading(false);

      if (res.ok && res.data?.session_id) {
        setSessionState(res.data);
        // Pre-test gate: Student must take pre-test before entering teaching chat
        const isPretestDone =
          Boolean(res.data.tests?.pre?.submitted_at) ||
          Boolean(res.data.events?.some((ev) => ev.type === 'pretest_submitted'));

        if (!isPretestDone) {
          router.replace(`/session/${sessionId}/pretest`);
          return;
        }

        if (res.data.conversation_history) {
          setMessages(
            res.data.conversation_history.map((m) => ({
              role: normalizeRole(m.role),
              content: m.content,
            }))
          );
        }
      } else {
        setError(res.data?.detail ?? res.error ?? 'Could not load this teaching session.');
      }
    };

    loadSession();

    return () => {
      cancelled = true;
    };
  }, [sessionId, token, router]);

  // Auto-scroll chat transcript to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pending]);

  const misconceptions: MisconceptionState[] = sessionState?.misconceptions || [];
  const currentThought: MisconceptionState | undefined = misconceptions[activeThoughtIndex];

  // Send teaching message to Nova
  const handleSendMessage = async () => {
    const text = input.trim();
    if (!text || pending) return;

    setInput('');
    setError('');
    setPending(true);
    setMessages((prev) => [...prev, { role: 'teacher', content: text }]);

    try {
      const res = await apiRequest<ChatResponse & ApiError>(
        `/sessions/${sessionId}/chat`,
        'POST',
        { message: text }
      );
      setPending(false);

      if (res.ok && res.data) {
        setMessages((prev) => [
          ...prev,
          { role: 'nova', content: res.data!.nova_response },
        ]);

        if (res.data.updated_state) {
          setSessionState(res.data.updated_state as SessionState);
        }
      } else {
        setError(
          res.data?.detail ?? res.error ?? 'Failed to send message to Nova.'
        );
      }
    } catch (err: unknown) {
      setPending(false);
      setError(err instanceof Error ? err.message : 'Error sending message.');
    }
  };

  // Teacher manually marks current thought/misconception as learned
  const handleMarkAsCorrect = async () => {
    if (!currentThought || markingCorrect) return;
    setMarkingCorrect(true);
    try {
      const res = await apiRequest<{ status: string; updated_state: SessionState } & ApiError>(
        `/sessions/${sessionId}/misconceptions/${currentThought.id}/mark-learned`,
        'POST'
      );
      setMarkingCorrect(false);

      if (res.ok && res.data) {
        if (res.data.updated_state) {
          setSessionState(res.data.updated_state);
        }
        setMessages((prev) => [
          ...prev,
          {
            role: 'nova',
            content: `Thank you for clarifying! I've updated my understanding on "${currentThought.concept || 'this topic'}".`,
          },
        ]);
      } else {
        setError(res.data?.detail ?? res.error ?? 'Could not mark as correct.');
      }
    } catch (err: unknown) {
      setMarkingCorrect(false);
      setError(err instanceof Error ? err.message : 'Failed to mark correct.');
    }
  };

  const handleNextThought = () => {
    if (misconceptions.length === 0) return;
    setActiveThoughtIndex((prev) => (prev + 1) % misconceptions.length);
  };

  const handlePrevThought = () => {
    if (misconceptions.length === 0) return;
    setActiveThoughtIndex((prev) => (prev - 1 + misconceptions.length) % misconceptions.length);
  };

  if (!ready || loading) {
    return (
      <main className="dash-loading">
        <span className="dash-spinner" aria-hidden="true" />
      </main>
    );
  }

  if (error && !sessionState) {
    return (
      <div className="teaching-workspace">
        <div style={{ maxWidth: '600px', margin: '4rem auto', padding: '2rem', background: '#1c2128', borderRadius: '24px', border: '1.5px solid rgba(111,175,154,0.3)', textAlign: 'center', color: '#f0f6fc' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 0.5rem' }}>Unable to Open Session</h2>
          <p style={{ color: '#8b949e', marginBottom: '1.5rem' }}>{error}</p>
          <button type="button" onClick={() => router.push('/dashboard')} className="dash-btn">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Calculate percentage of misconceptions corrected
  const learnedCount = misconceptions.filter((m) => m.is_corrected).length;
  const convincedPercent = misconceptions.length > 0 ? Math.round((learnedCount / misconceptions.length) * 100) : 0;

  return (
    <div className="teaching-workspace" style={{ marginTop: '5rem' }}>
      {/* Top Header bar matching reference mockup */}
      <div className="teaching-topbar">
        <div className="teaching-topbar__left">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="teaching-back-btn"
            title="Back to Dashboard"
            aria-label="Back"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <h1 className="teaching-topbar__title">
            {sessionState?.topic || (sessionState as unknown as { session_title?: string })?.session_title || 'Session Title'}
          </h1>
        </div>

        <div className="teaching-topbar__right">
          <button
            type="button"
            onClick={() => router.push(`/session/${sessionId}/exam`)}
            className="teaching-topbar-action-btn"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            START EXAM
          </button>

          
        </div>
      </div>

      {/* Two Main Cards Grid */}
      <div className="teaching-grid">
        {/* ===================================================================
            CARD 1: Left Thought Deck Canvas
           =================================================================== */}
        <section className="thought-canvas">
          <div className="thought-canvas__topbar">
            <div className="thought-canvas__headline">
              
              <span>Start teaching.</span>
            </div>

            <div className="thought-canvas__tabs">
              <button
                type="button"
                className={`thought-canvas__tab-btn ${activeTab === 'thoughts' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('thoughts')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 2 7 12 12 22 7 12 2" />
                  <polyline points="2 17 12 22 22 17" />
                  <polyline points="2 12 12 17 22 12" />
                </svg>
                Thoughts
              </button>
              <button
                type="button"
                className={`thought-canvas__tab-btn ${activeTab === 'notes' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('notes')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                </svg>
                Notes
              </button>
            </div>
          </div>

          {/* Stacked Cards Area */}
          {activeTab === 'thoughts' ? (
            <div className="thought-deck-container">
              {/* Stacked depth layers on the right/back */}
              <div className="thought-card-shadow-3" />
              <div className="thought-card-shadow-2" />
              <div className="thought-card-shadow-1" />

              {/* Navigation Arrows */}
              {misconceptions.length > 1 && (
                <button
                  type="button"
                  className="thought-deck-arrow thought-deck-arrow--prev"
                  onClick={handlePrevThought}
                  aria-label="Previous Thought"
                  title="Previous Thought"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
              )}

              {misconceptions.length > 1 && (
                <button
                  type="button"
                  className="thought-deck-arrow thought-deck-arrow--next"
                  onClick={handleNextThought}
                  aria-label="Next Thought"
                  title="Next Thought"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              )}

              {/* Foreground Thought Card */}
              <div className="thought-card">
                <div className="thought-card__header">
                  <div className="thought-card__author">
                    
                    <h2 className="thought-card__title">
                      Thought {activeThoughtIndex + 1}
                    </h2>
                  </div>

                </div>

                <div className="thought-card__body">
                  <p className="thought-card__quote">
                    {currentThought?.wrong_concept || 'I think that loops only work with arrays and collections.'}
                  </p>
                </div>

                <div className="thought-card__footer">
                  <button type="button" className="thought-card__icon-btn" title="View details" aria-label="Details">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="4" />
                      <line x1="9" y1="9" x2="15" y2="9" />
                      <line x1="9" y1="13" x2="15" y2="13" />
                      <line x1="9" y1="17" x2="11" y2="17" />
                    </svg>
                  </button>

                  <span className="thought-card__page-count">
                    {activeThoughtIndex + 1} of {misconceptions.length}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* Notes Tab View */
            <div className="thought-notes-view">
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.85rem' }}>Lecture Objectives & Concepts</h3>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.65rem', color: '#8b949e', fontSize: '0.9rem', lineHeight: 1.55 }}>
                {sessionState?.learning_objectives?.map((obj, i) => (
                  <li key={i}>{obj}</li>
                )) || <li>No recorded lecture objectives.</li>}
              </ul>
            </div>
          )}

          {/* Dots Indicator & Footer Text Matching Reference */}
          <div className="thought-canvas__bottom-footer">
            {activeTab === 'thoughts' && misconceptions.length > 1 && (
              <div className="thought-dots">
                {misconceptions.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`thought-dot ${i === activeThoughtIndex ? 'is-active' : ''}`}
                    onClick={() => setActiveThoughtIndex(i)}
                    aria-label={`Jump to thought ${i + 1}`}
                  />
                ))}
              </div>
            )}
            <p className="thought-canvas__footer-text">
              Teach what you know. Learn twice.
            </p>
          </div>
        </section>

        {/* ===================================================================
            CARD 2: Right Nova Dialogue & Chat Card
           =================================================================== */}
        <section className="teaching-chatbox">
          {/* Header */}
          <div className="teaching-chatbox__header">
            
            <div>
              <h3 className="teaching-chatbox__name">Nova</h3>
              <p className="teaching-chatbox__status">{convincedPercent}% convinced</p>
            </div>
          </div>

          {/* Middle Transcript Area */}
          <div className="teaching-transcript-area">
            {messages.length === 0 ? (
              <div className="mockup-prompt-text">
                Teacher, this is what I believe about <strong>Thought {activeThoughtIndex + 1}</strong>. If I&apos;ve got it wrong, walk me through the reasoning so I really understand it. If it&apos;s right, go ahead and mark it correct.
              </div>
            ) : (
              messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`msg-row ${
                    m.role === 'teacher' ? 'msg-row--teacher' : 'msg-row--nova'
                  }`}
                >
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: m.role === 'teacher' ? '#7ee787' : '#8b949e', marginBottom: '0.25rem', padding: '0 0.35rem' }}>
                    {m.role === 'teacher' ? 'You' : 'Nova'}
                  </span>
                  <div
                    className={`msg-bubble ${
                      m.role === 'teacher' ? 'msg-bubble--teacher' : 'msg-bubble--nova'
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))
            )}

            {pending && (
              <div className="msg-row msg-row--nova">
                <div className="msg-bubble msg-bubble--nova" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontStyle: 'italic', color: '#8b949e' }}>
                  <span className="dash-spinner" style={{ width: '0.9rem', height: '0.9rem' }} />
                  Nova is reasoning…
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Bottom Controls Bar & Input Matching Mockup Exactly */}
          <div className="teaching-chatbox__bottom">
            <div className="teaching-chatbox__action-bar">
              <div className="teaching-thought-tag">
                
                <span>Thought {activeThoughtIndex + 1}</span>
              </div>

              <button
                type="button"
                className={`teaching-mark-btn ${currentThought?.is_corrected ? 'is-correct' : ''}`}
                onClick={handleMarkAsCorrect}
                disabled={markingCorrect || currentThought?.is_corrected}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {currentThought?.is_corrected ? 'Marked Correct' : 'Mark as correct'}
              </button>
            </div>

            <div className="teaching-chatbox__input-area">
              <input
                type="text"
                className="teaching-textarea"
                placeholder="Explain what needs to be fixed…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={pending}
              />

             

              <button
                type="button"
                className="teaching-send-btn"
                onClick={handleSendMessage}
                disabled={!input.trim() || pending}
                aria-label="Send message"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="19" x2="12" y2="5" />
                  <polyline points="5 12 12 5 19 12" />
                </svg>
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
