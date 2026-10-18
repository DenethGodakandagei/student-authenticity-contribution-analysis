// app/components/ChatBox.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { apiRequest } from '../utils/api';

interface Message {
  role: 'teacher' | 'nova';
  content: string;
}

// ── localStorage helpers ──────────────────────────────────────────────────────
const STORAGE_KEY = (id: string) => `nova_chat_${id}`;

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
        const response = await apiRequest(`/sessions/${sessionId}`, 'GET') as {
          ok: boolean;
          data: { conversation_history?: Array<{ role: string; content: string }> };
        };
        if (response.ok && response.data?.conversation_history?.length) {
          const normalized = response.data.conversation_history.map((m) => ({
            role: normalizeRole(m.role),
            content: m.content,
          } as Message));
          setMessages(normalized);
          saveToStorage(sessionId, normalized);
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
      ) as {
        ok: boolean;
        data: { conversation_history?: Array<{ role: string; content: string }> };
      };

      if (res.ok && res.data?.conversation_history) {
        const normalized = res.data.conversation_history.map((m) => ({
          role: normalizeRole(m.role),
          content: m.content,
        } as Message));
        setMessages(normalized);
        saveToStorage(sessionId, normalized);
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

  return (
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
            className={`flex ${msg.role === 'teacher' ? 'justify-end' : 'justify-start'}`}
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
  );
}
