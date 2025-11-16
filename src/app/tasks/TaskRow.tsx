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
  const effectiveStatus = (task?.status ?? (task?.done ? "done" : "open")) as
    | "open"
    | "done";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isDone = effectiveStatus === "done";

  async function complete() {
    if (isDone || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/tasks/complete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ task_id: task.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "任务完成失败");
      }
      location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  return (
    <li className="border rounded p-3 flex items-center justify-between">
      <div>
        <div className="font-medium">{task?.title ?? "(untitled)"}</div>
        <div className="text-xs opacity-70">status: {effectiveStatus}</div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <button
          onClick={complete}
          disabled={busy || isDone}
          className="px-3 py-1 border rounded disabled:opacity-50"
          title={isDone ? "Already done" : "Mark as done"}
        >
          {isDone ? "Done" : busy ? "Working…" : "Mark done"}
        </button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    </li>
  );
}
