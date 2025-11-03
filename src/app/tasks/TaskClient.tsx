'use client'
import { useTransition } from 'react'

export default function TaskClient({
  user,
  tasks,
  addTaskAction,
  toggleTaskAction,
  deleteTaskAction,
}: any) {
  const [isPending, startTransition] = useTransition()

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(() => addTaskAction(fd))
    e.currentTarget.reset()
  }

  function handleToggle(id: number, completed: boolean) {
    const fd = new FormData()
    fd.set('id', String(id))
    fd.set('done', String(!completed))
    startTransition(() => toggleTaskAction(fd))
  }

  function handleDelete(id: number) {
    const fd = new FormData()
    fd.set('id', String(id))
    startTransition(() => deleteTaskAction(fd))
  }

  return (
    <main className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Welcome, {user?.email}</h1>

      <form onSubmit={handleAdd} className="mb-4 flex gap-2">
        <input
          name="title"
          placeholder="New task..."
          className="border p-2 flex-1 rounded"
        />
        <button disabled={isPending} className="bg-black text-white px-4 py-2 rounded">
          {isPending ? 'Saving…' : 'Add'}
        </button>
      </form>

      <ul className="space-y-2">
        {tasks.map((t: any) => (
          <li key={t.id} className="border rounded p-2 flex justify-between items-center">
            <button
              onClick={() => handleToggle(t.id, t.completed)}
              className="text-left"
              title="Toggle complete"
            >
              <span className={t.completed ? 'line-through text-gray-400' : ''}>
                {t.title}
              </span>
            </button>
            <button onClick={() => handleDelete(t.id)} className="text-red-500" title="Delete">
              ✕
            </button>
          </li>
        ))}
      </ul>
    </main>
  )
}
