// src/app/skills/page.tsx
import { createSupabaseServer } from "@/lib/supabaseServer";

type SkillRow = {
  id: string;
  name: string | null;
  icon?: string | null;
  progress?: number | null;
  points?: number | null;
  level?: number | null;
  updated_at?: string | null;
};

function clampProgress(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function formatNumber(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) return "0";
  return value.toLocaleString();
}

function SkillCard({ skill }: { skill: SkillRow }) {
  const progress = clampProgress(skill.progress);
  const icon = skill.icon?.trim() || "🌱";

  return (
    <article
      className="border bg-white/80 shadow-sm flex flex-col items-center text-center w-[240px] flex-shrink-0"
      style={{
        borderRadius: "var(--radius-card)",
        padding: "var(--space-lg)",
        minHeight: "65vh",
        maxHeight: 560,
        borderColor: "var(--color-border, #E5E5E5)",
      }}
    >
      <div className="flex flex-col items-center w-full flex-grow justify-end gap-3 pt-6">
        <div
          className="relative flex w-12 items-end justify-center overflow-hidden rounded-full"
          style={{
            height: "72%",
            minHeight: 220,
            background:
              "linear-gradient(180deg, rgba(15,23,42,0.06), rgba(15,23,42,0.02))",
            border: "1px solid rgba(15,23,42,0.08)",
            padding: "12px 6px",
          }}
        >
          <div
            className="absolute inset-x-3 top-4 bottom-4 rounded-full bg-gray-100"
            aria-hidden
          />
          <div
            className="relative w-full rounded-full bg-gradient-to-t from-amber-400 via-orange-300 to-yellow-200 transition-all duration-500 ease-out"
            style={{
              height: `${progress}%`,
              minHeight: `${Math.min(Math.max(progress, 8), 95)}%`,
            }}
          />
        </div>
        <div className="text-base font-semibold text-gray-800">{progress}%</div>
      </div>
      <div className="mt-6 flex flex-col items-center gap-3 w-full">
        <div
          className="flex h-16 w-16 items-center justify-center text-3xl"
          style={{
            background: "var(--color-surface, #F8F8F8)",
            borderRadius: "9999px",
            border: "1px dashed #E5E5E5",
          }}
        >
          {icon}
        </div>
        <div className="space-y-2 w-full">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Skill
          </p>
          <h2 className="text-lg font-semibold text-gray-900">
            {skill.name ?? "未命名技能"}
          </h2>
          <div className="text-sm text-gray-600">
            Points {formatNumber(skill.points)} · Level{" "}
            {formatNumber(skill.level)}
          </div>
        </div>
      </div>
    </article>
  );
}

export default async function SkillsPage() {
  const supa = createSupabaseServer();
  const {
    data: { user },
  } = await supa.auth.getUser();
  if (!user)
    return <main className="p-6">请先登录 / Please sign in.</main>;

  const { data, error } = await supa
    .from("skills")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  const tableMissing =
    error &&
    (error.code === "42P01" ||
      error.message?.toLowerCase().includes("could not find the table"));

  if (error && !tableMissing) {
    return <main className="p-6">Error: {error.message}</main>;
  }

  const rows = (tableMissing ? [] : data) ?? [];

  return (
    <main className="flex w-full max-w-none flex-col gap-5 px-0 py-6 sm:px-2">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Skills
        </p>
        <h1 className="text-2xl font-semibold text-gray-900">
          AI 正在跟踪你的技能成长
        </h1>
        <p className="text-sm text-gray-600">
          完成聊天中的任务后，AI 会自动累积积分与等级，无需设置截止日期。
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
          暂无技能记录。完成任务或让 AI 添加技能，即可在这里看到成长轨迹。
        </section>
      ) : (
        <section className="overflow-x-auto -mx-5 px-5 sm:-mx-8 sm:px-8">
          <div className="flex flex-nowrap gap-3 py-3 min-w-[110%]">
            {rows.map((skill) => (
              <SkillCard key={skill.id} skill={skill as SkillRow} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
