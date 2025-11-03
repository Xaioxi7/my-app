// app/api/whoami/route.ts
import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabaseServer';

export async function GET() {
  const supa = createSupabaseServer();
  const { data: { user }, error } = await supa.auth.getUser();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!user) return NextResponse.json({ loggedIn: false }, { status: 200 });
  return NextResponse.json({ loggedIn: true, userId: user.id }, { status: 200 });
}
