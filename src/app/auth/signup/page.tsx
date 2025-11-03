'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    setErr(null);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setErr(error.message);
        return;
      }

      // 关键逻辑：
      // - 如果后台关闭了“Confirm email”，Supabase 会直接返回 session（已登录）
      // - 如果后台开启了“Confirm email”，不会返回 session，需要用户去邮箱点确认链接
      if (data.session) {
        // 已经登录，直接进站
        setMsg('Account created. Logging you in…');
        router.replace('/chat');
      } else {
        // 没有 session，则说明后台开启了邮件验证（或策略需要）
        setMsg('Sign up successful! Please check your email to verify, then sign in.');
      }
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Sign up</h1>

      {err && (
        <div className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {err}
        </div>
      )}
      {msg && (
        <div className="mb-4 rounded border border-green-300 bg-green-50 p-3 text-sm text-green-700">
          {msg}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-3">
        <input
          type="email"
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded border p-2"
          required
        />
        <input
          type="password"
          placeholder="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded border p-2"
          autoComplete="new-password"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-black px-4 py-2 text-white disabled:opacity-60"
        >
          {loading ? 'Creating…' : 'Create account'}
        </button>
      </form>

      <p className="mt-4 text-sm text-center">
        Already have an account?{' '}
        <Link href="/auth/signin" className="text-blue-600 underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
