'use client';

import React, { useEffect, useRef, useState } from 'react';

type Msg = {
  id: string;
  thread_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
};

function getStorageKey(userId?: string | null) {
  return userId ? `chat_thread_${userId}` : 'chat_thread_id';
}

export default function ChatClient() {
  const [profile, setProfile] = useState<{ id: string } | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [thinking, setThinking] = useState(false); // NEW: 助手思考中
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // ------ helpers ------
  async function ensureThread(userId?: string | null): Promise<string> {
    const storageKey = getStorageKey(userId);
    const cached = typeof window !== 'undefined'
      ? localStorage.getItem(storageKey)
      : null;
    if (cached) return cached;

    const r = await fetch('/api/chat/thread', { method: 'POST' });
    const data = await r.json();
    const id = data.id as string;
    if (typeof window !== 'undefined' && userId) {
      localStorage.setItem(storageKey, id);
    }
    return id;
  }

  async function loadHistory(id: string) {
    const r = await fetch(`/api/chat/history?thread_id=${id}`);
    const body = await r.text(); // read once so we can log raw errors too

    if (!r.ok) {
      console.error(`Failed to load history (${r.status}):`, body);
      setError(`无法加载历史（${r.status}）：${body || '请稍后再试'}`);
      return;
    }

    const data = body ? JSON.parse(body) : { messages: [] };
    setError(null);
    setMessages(data.messages || []);
    // 滚到最底部
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
    });
  }

  async function sendUserMessage() {
    if (!input.trim() || !threadId) return;
    setLoading(true);
    setError(null);
    try {
      // 1) 写入“用户消息”
      const messageResp = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thread_id: threadId,
          role: 'user',
          content: input.trim(),
        }),
      });
      const messageBody = await messageResp.text();
      if (!messageResp.ok) {
        throw new Error(`发送失败（${messageResp.status}）：${messageBody || '服务器无响应'}`);
      }

      // 2) 先清输入框 + 刷一次历史（立刻看到自己的那条）
      setInput('');
      await loadHistory(threadId);

      // 3) 触发后端生成助手回复（NEW）
      setThinking(true);
      const replyResp = await fetch(`/api/chat/reply?thread_id=${threadId}`, { method: 'POST' });
      const replyBody = await replyResp.text();
      if (!replyResp.ok) {
        throw new Error(`助手回复失败（${replyResp.status}）：${replyBody || '服务器无响应'}`);
      }

      // 4) 再拉一次历史（展示助手回复）
      await loadHistory(threadId);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setThinking(false);
      setLoading(false);
    }
  }

  // ------ bootstrapping ------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const who = await fetch("/api/whoami").then((r) => r.json()).catch(() => null);
        if (!cancelled) {
          if (who?.id || who?.userId) {
            setProfile({ id: who.id ?? who.userId });
          } else {
            setProfile(null);
            setThreadId(null);
          }
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!profile?.id) return;
    (async () => {
      try {
        if (typeof window !== "undefined") {
          localStorage.removeItem("chat_thread_id");
        }
        const id = await ensureThread(profile.id);
        setThreadId(id);
        await loadHistory(id);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : String(err));
      }
    })();
  }, [profile]);

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

      {error && (
        <div className="text-sm text-red-600 border border-red-200 bg-red-50 rounded-md px-3 py-2">
          {error}
        </div>
      )}
    </div>
  );
}
