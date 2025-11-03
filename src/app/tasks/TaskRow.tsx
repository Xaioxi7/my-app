// src/app/tasks/TaskRow.tsx
"use client";

import { useState } from "react";

type Task = {
  id: number | string;
  title?: string | null;
  status?: string | null; // "open" | "done" | null
  done?: boolean | null;  // 兼容老字段
};

export default function TaskRow({ task }: { task: Task }) {
  // 再次兜底，避免读取 undefined 属性
  const effectiveStatus = (task?.status ?? (task?.done ? "done" : "open")) as
    | "open"
    | "done";
  const [busy, setBusy] = useState(false);
  const isDone = effectiveStatus === "done";

  async function complete() {
    if (isDone) return;
    setBusy(true);
    try {
      await fetch("/api/ai/process", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: `Complete task with id ${task.id}` }],
        }),
      });
      location.reload(); // 简单刷新
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="border rounded p-3 flex items-center justify-between">
      <div>
        <div className="font-medium">{task?.title ?? "(untitled)"}</div>
        <div className="text-xs opacity-70">status: {effectiveStatus}</div>
      </div>
      <button
        onClick={complete}
        disabled={busy || isDone}
        className="px-3 py-1 border rounded"
        title={isDone ? "Already done" : "Mark as done"}
      >
        {isDone ? "Done" : busy ? "Working…" : "Mark done"}
      </button>
    </li>
  );
}
