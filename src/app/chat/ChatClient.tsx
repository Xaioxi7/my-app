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
  const [thinking, setThinking] = useState(false); // NEW: 助手思考中
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
    // 滚到最底部
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
    });
  }

  async function sendUserMessage() {
    if (!input.trim() || !threadId) return;
    setLoading(true);
    try {
      // 1) 写入“用户消息”
      await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thread_id: threadId,
          role: 'user',
          content: input.trim(),
        }),
      });

      // 2) 先清输入框 + 刷一次历史（立刻看到自己的那条）
      setInput('');
      await loadHistory(threadId);

      // 3) 触发后端生成助手回复（NEW）
      setThinking(true);
      await fetch(`/api/chat/reply?thread_id=${threadId}`, { method: 'POST' });

      // 4) 再拉一次历史（展示助手回复）
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
      {/* 头部说明 */}
      <div className="rounded-lg border p-4 text-sm leading-6">
        <b>Assistant/助理：</b> 你好！我能像 ChatGPT 一样自由回答；当你需要时，我也会自动帮你管理任务/技能。<br />
        <span className="opacity-70">
          Hi! I can chat freely like ChatGPT, and when needed I’ll manage your tasks/skills automatically.
        </span>
      </div>

      {/* 消息列表 */}
      <div
        ref={listRef}
        className="min-h-[300px] max-h-[50vh] overflow-auto rounded-lg border p-3 space-y-3 bg-white"
      >
        {messages.length === 0 && (
          <div className="text-sm opacity-60">
            （还没有历史消息 / No messages yet）
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

        {/* NEW: 助手“输入中”占位 */}
        {thinking && (
          <div className="flex justify-start">
            <div className="rounded-xl px-3 py-2 text-sm shadow-sm border bg-gray-50 border-gray-200">
              <div className="text-[11px] uppercase tracking-wide opacity-50 mb-0.5">
                assistant
              </div>
              <div className="opacity-70">（正在思考…）</div>
            </div>
          </div>
        )}
      </div>

      {/* 输入区 */}
      <form
        onSubmit={(e) => { e.preventDefault(); sendUserMessage(); }}
        className="flex gap-2"
      >
        <input
          className="flex-1 rounded-lg border px-3 py-2"
          placeholder="随便问任何问题，或说：添加一个任务…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          type="submit"
          disabled={loading || !threadId}
          className="rounded-lg bg-black text-white px-4 py-2 disabled:opacity-50"
        >
          {loading ? '发送中…' : '发送'}
        </button>
      </form>

      {/* 线程信息（调试用） */}
      <div className="text-xs opacity-60">
        thread_id: {threadId ?? '(loading…)'}
      </div>
    </div>
  );
}
