// src/app/tasks/page.tsx
import Image from "next/image";
import { createSupabaseServer } from "@/lib/supabaseServer";
import TaskRow from "./TaskRow";

type Goal = {
  id: string;
  cover_image_url?: string | null;
  title?: string | null;
  target_label?: string | null;
  target_value?: string | number | null;
  current_label?: string | null;
  current_value?: string | number | null;
  progress?: number | null;
  notes?: string | null;
};

function clampProgress(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function formatMetric(value?: string | number | null) {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") return value.toString();
  const trimmed = value.trim();
  return trimmed.length === 0 ? "—" : trimmed;
}

function extractMetricFromNotes(
  notes?: string | null,
  keyword?: "current" | "target"
) {
  if (!notes) return null;
  let regex: RegExp | null = null;
  if (keyword === "current") {
    regex = /current[^$\d\-]*([$¥€£]?\s*-?\d[\d,]*(?:\.\d+)?)/i;
  }
  if (keyword === "target") {
    regex = /target[^$\d\-]*([$¥€£]?\s*-?\d[\d,]*(?:\.\d+)?)/i;
  }
  if (regex) {
    const match = notes.match(regex);
    if (match?.[1]) return match[1].replace(/\s+/g, "");
  }
  const fallback = notes.match(/([$¥€£]?\s*-?\d[\d,]*(?:\.\d+)?)/);
  return fallback?.[1]?.replace(/\s+/g, "") ?? null;
}

function GoalSection({ goal }: { goal: Goal | null }) {
  if (!goal) {
    return (
      <section className="rounded-2xl border bg-white/70 p-6 shadow-sm space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Big Goal
        </p>
        <h2 className="text-lg font-semibold">未设置主要目标</h2>
        <p className="text-sm text-gray-600">
          通过聊天告诉 AI 你的长期目标，它会在这里显示并驱动每日任务。
        </p>
      </section>
    );
  }

  const progress = clampProgress(goal.progress);
  const derivedCurrent =
    goal.current_value ?? extractMetricFromNotes(goal.notes, "current");
  const derivedTarget =
    goal.target_value ?? extractMetricFromNotes(goal.notes, "target");

  return (
    <section className="rounded-2xl border bg-white/80 p-6 shadow-sm">
      <div className="flex flex-col gap-6 md:flex-row">
        {goal.cover_image_url ? (
          <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-xl border bg-gray-100">
            <Image
              src={goal.cover_image_url}
              alt={goal.title ?? "Goal cover"}
              fill
              sizes="128px"
              className="object-cover"
            />
          </div>
        ) : (
          <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-xl border border-dashed bg-gray-50 text-4xl">
            🎯
          </div>
        )}
        <div className="flex-1 space-y-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Big Goal
              </p>
              <h2 className="text-xl font-semibold">
                {goal.title ?? "未命名目标"}
              </h2>
              {goal.notes ? (
                <p className="text-sm text-gray-600">{goal.notes}</p>
              ) : (
                <p className="text-sm text-gray-600">
                  Current salary: {formatMetric(derivedCurrent)}，Target salary:{" "}
                  {formatMetric(derivedTarget)}
                </p>
              )}
            </div>
            {progress !== null && (
              <div className="text-left md:text-right">
                <div className="text-3xl font-bold text-amber-500">
                  {progress}%
                </div>
                <p className="text-xs text-gray-500">Progress</p>
              </div>
            )}
          </div>
          {progress !== null && (
            <div className="h-2 rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-amber-400 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-xl border bg-white/70 p-3">
              <p className="text-xs uppercase tracking-wide text-gray-500">
                {goal.current_label ?? "Current"}
              </p>
              <p className="text-lg font-semibold">
                {formatMetric(derivedCurrent)}
              </p>
            </div>
            <div className="rounded-xl border bg-white/70 p-3">
              <p className="text-xs uppercase tracking-wide text-gray-500">
                {goal.target_label ?? "Target"}
              </p>
              <p className="text-lg font-semibold">
                {formatMetric(derivedTarget)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default async function TasksPage() {
  const supa = createSupabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return <main className="p-6">请先登录 / Please sign in.</main>;

  const [{ data: goals, error: goalError }, { data: tasks, error }] =
    await Promise.all([
      supa
        .from("goals")
        .select("*")
        .eq("user_id", user.id)
        .eq("visible", true)
        .order("created_at", { ascending: false })
        .limit(1),
      supa
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

  if (error) {
    return <main className="p-6">Error: {error.message}</main>;
  }
  const goalMissing =
    goalError &&
    (goalError.code === "42P01" ||
      goalError.message?.toLowerCase().includes("could not find the table"));

  // 兜底：老数据可能没有 status；用 done 来推导
  const rows = (tasks ?? []).map((t: any) => ({
    ...t,
    status: t?.status ?? (t?.done ? "done" : "open"),
  }));

  return (
    <main className="space-y-4 bg-slate-50 p-6">
      <div className="space-y-3">
        <h1 className="text-xl font-bold">My Tasks</h1>
        <GoalSection goal={goalMissing ? null : ((goals?.[0] as Goal) ?? null)} />
        {goalError && !goalMissing && (
          <p className="text-sm text-red-600">Goal error: {goalError.message}</p>
        )}
      </div>
      {rows.length === 0 ? (
        <p className="opacity-70">暂无任务 / No tasks yet.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((t: any) => (
            <TaskRow key={t.id} task={t} />
          ))}
        </ul>
      )}
    </main>
  );
}
