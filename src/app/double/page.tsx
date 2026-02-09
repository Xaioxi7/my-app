// src/app/double/page.tsx
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabaseServer";
import ChatClient from "../chat/ChatClient";
import TaskRow from "../tasks/TaskRow";

export const dynamic = "force-dynamic";

export default async function DoublePage() {
  const supa = createSupabaseServer();
  const {
    data: { user },
  } = await supa.auth.getUser();
  if (!user) redirect("/auth/signin");

  const { data, error } = await supa
    .from("tasks")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const rows = (data ?? []).map((task) => ({
    ...task,
    status: task?.status ?? (task?.done ? "done" : "open"),
  }));

  return (
    <main
      className="mx-auto flex w-full max-w-6xl flex-col"
      style={{ gap: "var(--space-lg)", padding: "var(--space-lg)" }}
    >
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Double Mode
        </p>
        <h1 className="text-2xl font-semibold text-gray-900">
          Chat and tasks side by side
        </h1>
        <p className="text-sm text-gray-600">
          Keep chatting with AI on the left, and track task progress on the right.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-2">
        <div
          className="flex flex-col overflow-hidden border bg-white/80 shadow-sm"
          style={{
            borderRadius: "var(--radius-card)",
            borderColor: "var(--color-border, #E5E5E5)",
          }}
        >
          <div className="border-b px-6 py-4" style={{ borderColor: "var(--color-border, #E5E5E5)" }}>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              Chat
            </h2>
            <p className="text-base font-semibold text-gray-900">
              Collaborate with AI
            </p>
          </div>
          <div className="flex-1 overflow-y-auto px-2 py-4 sm:px-4">
            <ChatClient />
          </div>
        </div>

        <div
          className="flex flex-col border bg-white/80 shadow-sm"
          style={{
            borderRadius: "var(--radius-card)",
            borderColor: "var(--color-border, #E5E5E5)",
          }}
        >
          <div className="border-b px-6 py-4" style={{ borderColor: "var(--color-border, #E5E5E5)" }}>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              Tasks
            </h2>
            <p className="text-base font-semibold text-gray-900">
              Today’s list
            </p>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {error ? (
              <p className="text-sm text-red-600">{error.message}</p>
            ) : rows.length === 0 ? (
              <p className="text-sm text-gray-600">
                No tasks yet. Ask the AI in chat to add a task.
              </p>
            ) : (
              <ul className="space-y-3">
                {rows.map((task) => (
                  <TaskRow key={task.id} task={task} />
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
