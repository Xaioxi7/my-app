// src/app/double/page.tsx
export default function DoublePage() {
  return (
    <section>
      <h1 className="mb-4 text-2xl font-semibold">Double</h1>
      <div className="grid grid-cols-2 gap-6">
        <div className="rounded-lg border border-neutral-800 p-4">
          <div className="mb-2 text-sm font-medium">Chat</div>
          <div className="h-64 rounded bg-neutral-900" />
        </div>
        <div className="rounded-lg border border-neutral-800 p-4">
          <div className="mb-2 text-sm font-medium">Tasks</div>
          <ul className="space-y-2 text-sm">
            <li>Learn Python 20 minutes daily</li>
            <li>Review 15 English words</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
