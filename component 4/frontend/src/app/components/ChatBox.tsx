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
    <section className="card flex flex-col">
      <h2 className="mb-4 text-lg font-semibold">Teaching session</h2>

      <div className="mb-4 max-h-[58vh] min-h-[16rem] space-y-4 overflow-y-auto pr-1">
        {loadingHistory && (
          <p className="flex items-center gap-2 py-8 text-center text-sm text-gray-400">
            <span className="spinner" /> Loading conversation…
          </p>
        )}

        {!loadingHistory && messages.length === 0 && !error && (
          <p className="py-8 text-center text-sm text-gray-500">
            Start teaching Nova by explaining a concept below.
          </p>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex flex-col ${
              msg.role === 'teacher' ? 'items-end' : 'items-start'
            }`}
          >
            <span className="mb-1 text-[11px] uppercase tracking-wide text-gray-500">
              {msg.role === 'teacher' ? 'You' : 'Nova'}
            </span>
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-xl p-3 text-sm leading-relaxed ${
                msg.role === 'teacher'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-800 text-gray-100'
              }`}
            >
              {msg.content}
            </div>

            {i === lastNovaIndex && check && CHECK_BADGE[check.result] && (
              <span
                className={`mt-1.5 ml-1 rounded-full border px-2 py-0.5 text-xs font-medium ${
                  CHECK_BADGE[check.result].className
                }`}
                title={check.feedback ?? check.question ?? undefined}
              >
                {CHECK_BADGE[check.result].label}
              </span>
            )}
          </div>
        ))}

        {pending && (
          <div className="flex flex-col items-start">
            <span className="mb-1 text-[11px] uppercase tracking-wide text-gray-500">
              Nova
            </span>
            <div className="rounded-xl bg-gray-800 p-3 text-sm italic text-gray-400">
              Nova is thinking…
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {error && (
        <p className="mb-3 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <textarea
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Explain the concept… (Enter to send, Shift+Enter for a new line)"
          className="min-w-0 flex-1 rounded-md bg-gray-900 p-2 text-gray-100 placeholder:text-gray-500"
        />
        <button
          type="button"
          onClick={sendMessage}
          className="button min-w-[90px]"
          disabled={pending || !input.trim()}
        >
          {pending ? <span className="spinner" /> : 'Send'}
        </button>
      </div>
    </section>
  );
}
