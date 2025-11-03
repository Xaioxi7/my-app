// src/app/tasks/page.tsx
import { createSupabaseServer } from "@/lib/supabaseServer";
import TaskRow from "./TaskRow";

export default async function TasksPage() {
  const supa = createSupabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return <main className="p-6">请先登录 / Please sign in.</main>;

  const { data: tasks, error } = await supa
    .from("tasks")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return <main className="p-6">Error: {error.message}</main>;
  }

  // 兜底：老数据可能没有 status；用 done 来推导
  const rows = (tasks ?? []).map((t: any) => ({
    ...t,
    status: t?.status ?? (t?.done ? "done" : "open"),
  }));

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-xl font-bold">My Tasks</h1>
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
