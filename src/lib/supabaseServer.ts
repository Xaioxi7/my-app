// src/lib/supabaseServer.ts
// Note: Keep both clients — one for auth-aware reads, one for admin writes.

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
        try {
          cookieStore.set({ name, value, ...options });
        } catch (err) {
          console.warn('[supabaseServer] cookie set skipped:', (err as Error)?.message);
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: '', ...options, maxAge: 0 });
        } catch (err) {
          console.warn('[supabaseServer] cookie remove skipped:', (err as Error)?.message);
        }
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
