// src/app/skills/page.tsx
const skills = [
  { name: "English", value: 25 },
  { name: "Writing", value: 10 },
  { name: "Drawing", value: 70 },
  { name: "Coding", value: 90 },
];

export default function SkillsPage() {
  return (
    <section>
      <h1 className="mb-6 text-2xl font-semibold">Skills</h1>
      <div className="grid grid-cols-4 gap-6">
        {skills.map((s) => (
          <div key={s.name} className="flex flex-col items-center gap-2">
            <div className="flex h-48 w-8 items-end rounded bg-neutral-800">
              <div
                className="w-8 rounded bg-neutral-200"
                style={{ height: `${s.value}%` }}
              />
            </div>
            <div className="text-sm text-neutral-300">{s.name}</div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-neutral-500">
        Values auto-updated by AI (later). No deadlines.
      </p>
    </section>
  );
}
