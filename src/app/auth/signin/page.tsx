'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErr(null)

    try {
      // 1) 前端登录
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setErr(error.message)
        return
      }

      // 2) ★ 同步到服务端（把 session 带过去）
      await fetch('/auth/refresh', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ event: 'SIGNED_IN', session: data.session }),
        // 同源即可，不用写 credentials
      })

      // 3) 跳转
      router.replace('/chat')
    } catch (e: any) {
      setErr(String(e?.message || e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Sign in</h1>

      {err && (
        <div className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {err}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-3">
        <input
          type="email"
          placeholder="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full rounded border p-2"
          required
        />
        <input
          type="password"
          placeholder="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full rounded border p-2"
          autoComplete="current-password"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-black px-4 py-2 text-white disabled:opacity-60"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="mt-4 text-sm text-center">
        No account?{' '}
        <Link href="/auth/signup" className="text-blue-600 underline">Sign up</Link>
      </p>
    </main>
  )
}
