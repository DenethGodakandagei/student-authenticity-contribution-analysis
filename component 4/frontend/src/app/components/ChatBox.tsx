// app/components/ChatBox.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { apiRequest } from '../utils/api';
import ProgressCard, { UnderstandingSummary } from './ProgressCard';

interface Message {
  role: 'teacher' | 'nova';
  content: string;
}

type CheckResult = 'passed' | 'failed' | 'needs_review';

interface CheckInfo {
  result: CheckResult;
  question: string | null;
  feedback: string | null;
}

interface ChatResponse {
  conversation_history?: Array<{ role: string; content: string }>;
  check_question?: string | null;
  check_result?: CheckResult | null;
  check_feedback?: string | null;
  understanding?: UnderstandingSummary;
}

const CHECK_BADGE: Record<CheckResult, { label: string; className: string }> = {
  passed: {
    label: 'Passed',
    className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  },
  failed: {
    label: 'Try again',
    className: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
  },
  needs_review: {
    label: 'Review lecture page',
    className: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/40',
  },
};

// ── localStorage helpers ──────────────────────────────────────────────────────
const STORAGE_KEY = (id: string) => `nova_chat_${id}`;
const CHECK_KEY = (id: string) => `nova_chat_check_${id}`;
const PROGRESS_KEY = (id: string) => `nova_progress_${id}`;

function loadCheck(sessionId: string): CheckInfo | null {
  try {
    const raw = localStorage.getItem(CHECK_KEY(sessionId));
    return raw ? (JSON.parse(raw) as CheckInfo) : null;
  } catch {
    return null;
  }
}

function saveCheck(sessionId: string, check: CheckInfo | null) {
  try {
    if (check) localStorage.setItem(CHECK_KEY(sessionId), JSON.stringify(check));
    else localStorage.removeItem(CHECK_KEY(sessionId));
  } catch {
    // ignore
  }
}

function loadUnderstanding(sessionId: string): UnderstandingSummary | null {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY(sessionId));
    return raw ? (JSON.parse(raw) as UnderstandingSummary) : null;
  } catch {
    return null;
  }
}

function saveUnderstanding(sessionId: string, data: UnderstandingSummary | null) {
  try {
    if (data) localStorage.setItem(PROGRESS_KEY(sessionId), JSON.stringify(data));
  } catch {
    // ignore
  }
}

function loadFromStorage(sessionId: string): Message[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(sessionId));
    return raw ? (JSON.parse(raw) as Message[]) : [];
  } catch {
    return [];
  }
}

function saveToStorage(sessionId: string, msgs: Message[]) {
  try {
    // Never persist the "thinking" placeholder
    const toSave = msgs.filter((m) => !m.content.startsWith('⏳'));
    localStorage.setItem(STORAGE_KEY(sessionId), JSON.stringify(toSave));
  } catch {
    // localStorage unavailable (private browsing) — ignore silently
  }
}

function normalizeRole(role: string): 'teacher' | 'nova' {
  return role === 'user' ? 'teacher' : (role as 'teacher' | 'nova');
}
// ─────────────────────────────────────────────────────────────────────────────

export default function ChatBox({ sessionId }: { sessionId: string }) {
  // Initialise from localStorage immediately — no flash of empty chat
  const [messages, setMessages] = useState<Message[]>(() => loadFromStorage(sessionId));
  const [check, setCheck] = useState<CheckInfo | null>(() => loadCheck(sessionId));
  const [understanding, setUnderstanding] = useState<UnderstandingSummary | null>(() =>
    loadUnderstanding(sessionId)
  );
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Save to localStorage whenever messages change (skip thinking placeholder)
  useEffect(() => {
    if (messages.length > 0) {
      saveToStorage(sessionId, messages);
    }
  }, [messages, sessionId]);

  // On mount: sync from backend and merge with localStorage
  useEffect(() => {
    const syncFromBackend = async () => {
      try {
        const [sessionRes, summaryRes] = await Promise.all([
          apiRequest(`/sessions/${sessionId}`, 'GET') as Promise<{
            ok: boolean;
            data: { conversation_history?: Array<{ role: string; content: string }> };
          }>,
          apiRequest<UnderstandingSummary>(`/sessions/${sessionId}/summary`, 'GET'),
        ]);

        if (sessionRes.ok && sessionRes.data?.conversation_history?.length) {
          const normalized = sessionRes.data.conversation_history.map((m) => ({
            role: normalizeRole(m.role),
            content: m.content,
          } as Message));
          setMessages(normalized);
          saveToStorage(sessionId, normalized);
        }

        if (summaryRes.ok && summaryRes.data?.misconceptions) {
          setUnderstanding(summaryRes.data);
          saveUnderstanding(sessionId, summaryRes.data);
        }
      } catch {
        // Network error — keep showing cached localStorage data
      }
    };
    syncFromBackend();
  }, [sessionId]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();

    // Optimistically show teacher message + thinking indicator
    setMessages((prev) => [
      ...(prev ?? []),
      { role: 'teacher', content: userMsg },
      { role: 'nova', content: '⏳ Nova is thinking…' },
    ]);
    setInput('');
    setLoading(true);

    try {
      const res = await apiRequest(
        `/sessions/${sessionId}/chat`,
        'POST',
        { message: userMsg }
      ) as { ok: boolean; data?: ChatResponse };

      if (res.ok && res.data?.conversation_history) {
        const normalized = res.data.conversation_history.map((m) => ({
          role: normalizeRole(m.role),
          content: m.content,
        } as Message));
        setMessages(normalized);
        saveToStorage(sessionId, normalized);

        const newCheck: CheckInfo | null = res.data.check_result
          ? {
              result: res.data.check_result,
              question: res.data.check_question ?? null,
              feedback: res.data.check_feedback ?? null,
            }
          : null;
        setCheck(newCheck);
        saveCheck(sessionId, newCheck);

        if (res.data.understanding) {
          setUnderstanding(res.data.understanding);
          saveUnderstanding(sessionId, res.data.understanding);
        }
      } else {
        // Remove thinking indicator if backend returned no history
        setMessages((prev) => prev.filter((m) => !m.content.startsWith('⏳')));
      }
    } catch (e) {
      console.error('Network error while sending message', e);
      setMessages((prev) => prev.filter((m) => !m.content.startsWith('⏳')));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.shiftKey) && e.key === 'Enter') {
      e.preventDefault();
      sendMessage();
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Badge belongs to Nova's latest real reply (never the "thinking" placeholder)
  const lastNovaIndex = messages.reduce(
    (acc, m, i) => (m.role === 'nova' && !m.content.startsWith('⏳') ? i : acc),
    -1
  );
  const badge = check ? CHECK_BADGE[check.result] : null;

  return (
    <>
      {understanding && <ProgressCard data={understanding} />}

      <div className="card mt-6">
        <h2 className="text-xl mb-4">Teaching Session</h2>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto mb-4">
          {messages.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-8">
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
              <div
                className={`p-3 rounded-xl max-w-[80%] text-sm leading-relaxed ${
                  msg.role === 'teacher'
                    ? 'bg-indigo-600 text-white'
                    : msg.content.startsWith('⏳')
                    ? 'bg-gray-700 text-gray-400 italic'
                    : 'bg-gray-800 text-gray-100'
                }`}
              >
                {msg.content}
              </div>

              {i === lastNovaIndex && badge && (
                <span
                  className={`mt-1.5 ml-1 rounded-full border px-2 py-0.5 text-xs font-medium ${badge.className}`}
                  title={check?.feedback ?? check?.question ?? undefined}
                >
                  {badge.label}
                </span>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <div className="flex gap-2">
          <textarea
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Explain the concept… (Ctrl+Enter to send)"
            className="flex-1 p-2 rounded-md bg-gray-900 text-gray-100"
          />
          <button
            onClick={sendMessage}
            className="button min-w-[80px]"
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : 'Send'}
          </button>
        </div>
      </div>
    </>
  );
}
