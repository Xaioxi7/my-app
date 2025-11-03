// src/lib/supabaseServer.ts
// 🇨🇳 说明：保留“会话读取版”和“高权限写库版”两个客户端。
// 🇺🇸 Note: Keep both clients — one for auth-aware reads, one for admin writes.

import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

// ✅ For reading with user session (uses anon key + cookies)
export function createSupabaseServer() {
  const cookieStore = cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        // Keep Supabase's cookie options intact
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        cookieStore.set({ name, value: '', ...options, maxAge: 0 });
      },
    },
  });
}

// ✅ For server-only admin writes (uses Service Role key) — NEVER import in client code
export function supabaseWithServiceRole() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!; // or process.env.SUPABASE_URL if you set it
  const key = process.env.SUPABASE_SERVICE_ROLE!;    // server secret
  return createClient(url, key, { auth: { persistSession: false } });
}
