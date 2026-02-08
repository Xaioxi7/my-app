'use client'

import { useState, useEffect } from 'react'
import { useFormStatus } from 'react-dom'

function SubmitBtn() {
  const { pending } = useFormStatus()
  return (
    <button disabled={pending} className="w-full rounded bg-black p-3 text-white disabled:opacity-60">
      {pending ? 'Saving...' : 'Save'}
    </button>
  )
}

export default function EditUsername({
  action,
  hasUsername,
}: {
  action: (formData: FormData) => Promise<{ ok: boolean; error?: string }>
  hasUsername: boolean
}) {
  const [open, setOpen] = useState(!hasUsername) // Open by default when username is missing
  const [msg, setMsg] = useState<string | null>(null)

  async function onSubmit(formData: FormData) {
    const res = await action(formData)
    setMsg(res.ok ? 'Saved 🎉' : `Failed: ${res.error}`)
    if (res.ok && hasUsername === false) setOpen(false) // Close after first create
  }

  useEffect(() => {
    if (!msg) return
    const t = setTimeout(() => setMsg(null), 1800)
    return () => clearTimeout(t)
  }, [msg])

  return (
    <div className="mt-6">
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="rounded border px-4 py-2 text-sm hover:bg-gray-50"
        >
          Edit username
        </button>
      )}

      {msg && (
        <div className={`mb-4 mt-4 rounded border p-3 ${msg.startsWith('Saved') ? 'border-green-300 bg-green-50 text-green-700' : 'border-red-300 bg-red-50 text-red-700'}`}>
          {msg}
        </div>
      )}

      {open && (
        <form action={onSubmit} className="space-y-4">
          <input
            name="username"
            placeholder="Enter new username"
            className="w-full rounded border p-3"
          />
          <SubmitBtn />
          <div className="text-right">
            <button type="button" onClick={() => setOpen(false)} className="mt-2 text-sm text-gray-500 underline">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
