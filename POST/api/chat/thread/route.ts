// src/app/api/chat/thread/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServer, supabaseWithServiceRole } from "@/lib/supabaseServer";

export const runtime = "nodejs";

export async function POST() {
  const supa = createSupabaseServer();
  const { data: { user }, error } = await supa.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = supabaseWithServiceRole();
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

  // reuse the most recent thread within 24h
  const { data: recent } = await db
    .from("chat_threads")
    .select("*")
    .eq("user_id", user.id)
    .gte("updated_at", since)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recent) return NextResponse.json({ id: recent.id, reused: true });

  const { data, error: e2 } = await db
    .from("chat_threads")
    .insert({ user_id: user.id, title: "My Chat" })
    .select("id")
    .single();

  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });
  return NextResponse.json({ id: data!.id, reused: false });
}
