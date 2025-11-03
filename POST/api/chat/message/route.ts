// src/app/api/chat/message/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer, supabaseWithServiceRole } from "@/lib/supabaseServer";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const supa = createSupabaseServer();
  const { data: { user }, error } = await supa.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { thread_id, role, content } = await req.json();

  if (!thread_id || !role || !content) {
    return NextResponse.json({ error: "thread_id, role, content are required" }, { status: 400 });
  }
  if (!["user", "assistant", "system"].includes(role)) {
    return NextResponse.json({ error: "invalid role" }, { status: 400 });
  }

  const db = supabaseWithServiceRole();

  // ensure ownership
  const { data: thread } = await db
    .from("chat_threads")
    .select("id")
    .eq("id", thread_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!thread) return NextResponse.json({ error: "Thread not found" }, { status: 404 });

  const { data, error: iErr } = await db
    .from("chat_messages")
    .insert({ thread_id, user_id: user.id, role, content })
    .select("id, created_at")
    .single();

  if (iErr) return NextResponse.json({ error: iErr.message }, { status: 500 });

  // bump thread timestamp
  await db
    .from("chat_threads")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", thread_id);

  return NextResponse.json({ ok: true, id: data!.id, created_at: data!.created_at });
}
