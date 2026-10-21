// app/components/ChatBox.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { apiRequest } from '../utils/api';
import type {
  ApiError,
  ChatResponse,
  CheckResult,
  SessionState,
  UnderstandingSummary,
  DetectionItem,
} from '../utils/types';

interface Message {
  role: 'teacher' | 'nova';
  content: string;
}

interface CheckInfo {
  result: CheckResult;
  question: string | null;
  feedback: string | null;
}

/** Everything the right-hand column needs after a turn (or the initial load). */
export interface ChatTurn {
  understanding?: UnderstandingSummary;
  detection?: DetectionItem[];
  state?: SessionState;
  newly_corrected_ids?: string[];
}

/** Badge shown under Nova's reply — colours/labels as specified. */
const CHECK_BADGE: Record<CheckResult, { label: string; className: string }> = {
  passed: {
    label: 'Passed',
    className: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
  },
  failed: {
    label: 'Try again',
    className: 'border-amber-500/40 bg-amber-500/15 text-amber-300',
  },
  needs_review: {
    label: 'Review the lecture page',
    className: 'border-rose-500/40 bg-rose-500/15 text-rose-300',
  },
};

function normalizeRole(role: string): 'teacher' | 'nova' {
  return role === 'user' ? 'teacher' : (role as 'teacher' | 'nova');
}

function toMessages(history: Array<{ role: string; content: string }>): Message[] {
  return history.map((m) => ({ role: normalizeRole(m.role), content: m.content }));
}

export default function ChatBox({
  sessionId,
  onTurn,
}: {
  sessionId: string;
  onTurn?: (turn: ChatTurn) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState('');
  const [check, setCheck] = useState<CheckInfo | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Keep the callback in a ref so the mount effect never re-runs because the
  // parent re-rendered with a new function identity.
  const onTurnRef = useRef(onTurn);
  useEffect(() => {
    onTurnRef.current = onTurn;
  }, [onTurn]);

  // Load conversation history (and the session state for the researcher view)
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const res = await apiRequest<SessionState>(`/sessions/${sessionId}`, 'GET');
      if (cancelled) return;
      setLoadingHistory(false);
      if (res.ok && res.data?.conversation_history) {
        setMessages(toMessages(res.data.conversation_history));
        onTurnRef.current?.({ state: res.data });
      } else {
        const detail = (res.data as ApiError | undefined)?.detail;
        setError(detail ?? res.error ?? 'Could not load this conversation.');
      }
    };
    load();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  // Auto-scroll whenever the transcript or the pending bubble changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pending]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || pending) return;

    const previous = messages;
    setInput('');
    setError('');
    setPending(true);
    setMessages((prev) => [...prev, { role: 'teacher', content: text }]);

    const res = await apiRequest<ChatResponse & ApiError>(
      `/sessions/${sessionId}/chat`,
      'POST',
      { message: text }
    );
    setPending(false);

    if (res.ok && res.data?.conversation_history) {
      const data = res.data;
      setMessages(toMessages(data.conversation_history));
      setCheck(
        data.check_result
          ? {
              result: data.check_result,
              question: data.check_question ?? null,
              feedback: data.check_feedback ?? null,
            }
          : null
      );
      onTurn?.({
        understanding: data.understanding,
        detection: data.detection,
        state: data.updated_state,
        newly_corrected_ids: data.newly_corrected_ids,
      });
      return;
    }

    // Failure: restore the transcript and the draft, show the API error.
    setMessages(previous);
    setInput(text);
    setError(res.data?.detail ?? res.error ?? 'Nova could not reply. Please try again.');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const lastNovaIndex = messages.reduce(
    (acc, m, i) => (m.role === 'nova' ? i : acc),
    -1
  );

  return (
    <section className="card flex flex-col" style={{ padding: '1.5rem', background: '#ffffff', borderRadius: '20px', border: '1px solid rgba(111,175,154,0.3)', boxShadow: '0 4px 20px rgba(111,175,154,0.08)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.2rem 0.65rem',
              borderRadius: '999px',
              background: '#eff8f3',
              border: '1px solid rgba(111, 175, 154, 0.4)',
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: '#3e8b75',
              marginBottom: '0.35rem',
            }}
          >
            Live Tutoring
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#0d1110' }}>Teaching Nova</h2>
        </div>
        <span style={{ fontSize: '0.8rem', color: '#52615b', fontWeight: 500 }}>
          {messages.length > 0 ? `${Math.floor(messages.length / 2)} turns` : 'Ready to start'}
        </span>
      </div>

      <div className="chat-transcript">
        {loadingHistory && (
          <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '2rem 0', color: '#52615b', fontSize: '0.88rem' }}>
            <span className="dash-spinner" style={{ width: '1.2rem', height: '1.2rem' }} /> Loading conversation history…
          </p>
        )}

        {!loadingHistory && messages.length === 0 && !error && (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#52615b' }}>
            <p style={{ fontSize: '1rem', fontWeight: 600, color: '#0d1110', margin: '0 0 0.4rem' }}>
              Say hello and start teaching Nova! 👋
            </p>
            <p style={{ fontSize: '0.86rem', maxWidth: '420px', margin: '0 auto', lineHeight: 1.5 }}>
              Explain concepts simply, use everyday analogies, or give code examples. Nova will respond and ask questions as she learns.
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex flex-col ${
              msg.role === 'teacher' ? 'items-end' : 'items-start'
            }`}
          >
            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.25rem', color: msg.role === 'teacher' ? '#3e8b75' : '#52615b' }}>
              {msg.role === 'teacher' ? 'You (Teacher)' : 'Nova (Student)'}
            </span>
            <div
              className={`max-w-[85%] whitespace-pre-wrap ${
                msg.role === 'teacher'
                  ? 'chat-bubble-teacher'
                  : 'chat-bubble-nova'
              }`}
            >
              {msg.content}
            </div>

            {i === lastNovaIndex && check && CHECK_BADGE[check.result] && (
              <span
                style={{
                  marginTop: '0.45rem',
                  marginLeft: '0.25rem',
                  padding: '0.2rem 0.65rem',
                  borderRadius: '999px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  background: check.result === 'passed' ? '#e6f7ef' : check.result === 'failed' ? '#fff8e6' : '#fdf3f2',
                  border: `1px solid ${check.result === 'passed' ? 'rgba(43,122,99,0.4)' : check.result === 'failed' ? 'rgba(183,121,31,0.4)' : 'rgba(180,68,60,0.4)'}`,
                  color: check.result === 'passed' ? '#2b7a63' : check.result === 'failed' ? '#b7791f' : '#b4443c',
                }}
                title={check.feedback ?? check.question ?? undefined}
              >
                {CHECK_BADGE[check.result].label}
              </span>
            )}
          </div>
        ))}

        {pending && (
          <div className="flex flex-col items-start">
            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.25rem', color: '#52615b' }}>
              Nova (Student)
            </span>
            <div className="chat-bubble-nova" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontStyle: 'italic', color: '#52615b' }}>
              <span className="dash-spinner" style={{ width: '0.85rem', height: '0.85rem' }} />
              Nova is thinking…
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="dash-alert" role="alert" style={{ margin: '0.85rem 0' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', alignItems: 'flex-start' }}>
        <textarea
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Explain the concept… (Enter to send, Shift+Enter for a new line)"
          className="chat-input"
        />
        <button
          type="button"
          onClick={sendMessage}
          className="dash-btn"
          disabled={pending || !input.trim()}
          style={{
            padding: '0.85rem 1.4rem',
            opacity: pending || !input.trim() ? 0.45 : 1,
            cursor: pending || !input.trim() ? 'not-allowed' : 'pointer',
          }}
        >
          {pending ? 'Sending…' : 'Send'}
        </button>
      </div>
    </section>
  );
}
