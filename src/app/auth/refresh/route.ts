// src/app/auth/refresh/route.ts
import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabaseServer'

export async function POST(req: Request) {
  const { event, session } = await req.json().catch(() => ({} as any))
  const supabase = createSupabaseServer()

  try {
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      // 必须同时带 access_token 和 refresh_token
      await supabase.auth.setSession({
        access_token: session?.access_token ?? '',
        refresh_token: session?.refresh_token ?? '',
      })
    } else if (event === 'SIGNED_OUT') {
      await supabase.auth.signOut()
    }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 })
  }
}
