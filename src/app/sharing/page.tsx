// src/app/sharing/page.tsx
import { createSupabaseServer } from "@/lib/supabaseServer";

type MomentRow = {
  id: string;
  title: string | null;
  summary?: string | null;
  source?: string | null;
  reason?: string | null;
  created_at?: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return "刚刚";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function MomentCard({ moment }: { moment: MomentRow }) {
  return (
    <article
      className="border bg-white/80 shadow-sm transition hover:shadow-md"
      style={{
        borderRadius: "var(--radius-card)",
        padding: "var(--space-lg)",
        borderColor: "var(--color-border, #E5E5E5)",
      }}
    >
      <header className="space-y-1">
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          {moment.source ?? "AI 推送"}
        </div>
        <h2 className="text-lg font-semibold text-gray-900">
          {moment.title ?? "未命名推荐"}
        </h2>
      </header>
      {moment.summary && (
        <p className="mt-3 text-sm leading-6 text-gray-700">{moment.summary}</p>
      )}
      {moment.reason && (
        <div
          className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800"
          style={{ borderRadius: "var(--radius-sm)" }}
        >
          推荐理由：{moment.reason}
        </div>
      )}
      <footer className="mt-4 text-xs text-gray-500">
        推送时间：{formatDate(moment.created_at)}
      </footer>
    </article>
  );
}

export default async function SharingPage() {
  const supa = createSupabaseServer();
  const {
    data: { user },
  } = await supa.auth.getUser();
  if (!user)
    return <main className="p-6">请先登录 / Please sign in.</main>;

  const { data, error } = await supa
    .from("moments")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const tableMissing =
    error &&
    (error.code === "42P01" ||
      error.message?.toLowerCase().includes("could not find the table"));

  if (error && !tableMissing) {
    return <main className="p-6">Error: {error.message}</main>;
  }

  const rows = (tableMissing ? [] : data) ?? [];

  return (
    <main
      className="mx-auto flex w-full max-w-4xl flex-col"
      style={{
        gap: "var(--space-lg)",
        padding: "var(--space-lg)",
      }}
    >
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Moments
        </p>
        <h1 className="text-2xl font-semibold text-gray-900">
          AI 推荐的学习/资源卡片
        </h1>
        <p className="text-sm text-gray-600">
          系统会在随机时间推送文章、视频或新闻，帮助你靠近 Big Goal。
        </p>
      </header>

      {rows.length === 0 ? (
        <section
          className="border bg-white/70 text-sm text-gray-600"
          style={{
            borderRadius: "var(--radius-card)",
            padding: "var(--space-lg)",
            borderColor: "var(--color-border, #E5E5E5)",
          }}
        >
          暂无 Moments。继续与 AI 互动或完成任务，系统会自动推送灵感卡片。
        </section>
      ) : (
        <section
          className="flex flex-col"
          style={{ gap: "var(--space-md)" }}
        >
          {rows.map((moment) => (
            <MomentCard key={moment.id} moment={moment as MomentRow} />
          ))}
        </section>
      )}
    </main>
  );
}
