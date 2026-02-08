'use client';

import React, { useEffect, useRef, useState } from 'react';

type Msg = {
  id: string;
  thread_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
};

const THREAD_STORAGE_KEY = 'chat_thread_id';

export default function ChatClient() {
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [thinking, setThinking] = useState(false); // NEW: assistant is thinking
  const listRef = useRef<HTMLDivElement>(null);

  // ------ helpers ------
  async function ensureThread(): Promise<string> {
    const cached = typeof window !== 'undefined'
      ? localStorage.getItem(THREAD_STORAGE_KEY)
      : null;
    if (cached) return cached;

    const r = await fetch('/api/chat/thread', { method: 'POST' });
    const data = await r.json();
    const id = data.id as string;
    if (typeof window !== 'undefined') {
      localStorage.setItem(THREAD_STORAGE_KEY, id);
    }
    return id;
  }

  async function loadHistory(id: string) {
    const r = await fetch(`/api/chat/history?thread_id=${id}`);
    const data = await r.json(); // { messages: [...] }
    setMessages(data.messages || []);
    // Scroll to bottom
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
    });
  }

  async function sendUserMessage() {
    if (!input.trim() || !threadId) return;
    setLoading(true);
    try {
      // 1) Write the user message
      await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thread_id: threadId,
          role: 'user',
          content: input.trim(),
        }),
      });

      // 2) Clear input, then refresh history
      setInput('');
      await loadHistory(threadId);

      // 3) Trigger backend reply generation (NEW)
      setThinking(true);
      await fetch(`/api/chat/reply?thread_id=${threadId}`, { method: 'POST' });

      // 4) Reload history to show assistant reply
      await loadHistory(threadId);
    } finally {
      setThinking(false);
      setLoading(false);
    }
  }

  // ------ bootstrapping ------
  useEffect(() => {
    (async () => {
      const id = await ensureThread();
      setThreadId(id);
      await loadHistory(id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-3xl p-4 flex flex-col gap-4">
      {/* Header */}
      <div className="rounded-lg border p-4 text-sm leading-6">
        <b>Assistant:</b> Hi! I can chat freely like ChatGPT, and when needed I’ll manage your tasks/skills automatically.<br />
        <span className="opacity-70">
          Hi! I can chat freely like ChatGPT, and when needed I’ll manage your tasks/skills automatically.
        </span>
      </div>

      {/* Message list */}
      <div
        ref={listRef}
        className="min-h-[300px] max-h-[50vh] overflow-auto rounded-lg border p-3 space-y-3 bg-white"
      >
        {messages.length === 0 && (
          <div className="text-sm opacity-60">
            No messages yet.
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`rounded-xl px-3 py-2 text-sm shadow-sm border
                ${m.role === 'user' ? 'bg-indigo-50 border-indigo-200' : 'bg-gray-50 border-gray-200'}
              `}
            >
              <div className="text-[11px] uppercase tracking-wide opacity-50 mb-0.5">
                {m.role}
              </div>
              <div className="whitespace-pre-wrap">{m.content}</div>
            </div>
          </div>
        ))}

        {/* NEW: assistant typing placeholder */}
        {thinking && (
          <div className="flex justify-start">
            <div className="rounded-xl px-3 py-2 text-sm shadow-sm border bg-gray-50 border-gray-200">
              <div className="text-[11px] uppercase tracking-wide opacity-50 mb-0.5">
                assistant
              </div>
              <div className="opacity-70">Thinking…</div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => { e.preventDefault(); sendUserMessage(); }}
        className="flex gap-2"
      >
        <input
          className="flex-1 rounded-lg border px-3 py-2"
          placeholder="Ask anything, or say: add a task…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          type="submit"
          disabled={loading || !threadId}
          className="rounded-lg bg-black text-white px-4 py-2 disabled:opacity-50"
        >
          {loading ? 'Sending…' : 'Send'}
        </button>
      </form>

      {/* Thread info (debug) */}
      <div className="text-xs opacity-60">
        thread_id: {threadId ?? '(loading…)'}
      </div>
    </div>
  );
}
