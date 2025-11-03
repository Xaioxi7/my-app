// src/app/api/chat/history/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer, supabaseWithServiceRole } from "@/lib/supabaseServer";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const supa = createSupabaseServer();
  const { data: { user }, error } = await supa.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const thread_id = new URL(req.url).searchParams.get("thread_id");
  if (!thread_id) return NextResponse.json({ error: "Missing thread_id" }, { status: 400 });

  const db = supabaseWithServiceRole();

  // ensure ownership
  const { data: thread } = await db
    .from("chat_threads")
    .select("id")
    .eq("id", thread_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!thread) return NextResponse.json({ error: "Thread not found" }, { status: 404 });

  const { data, error: mErr } = await db
    .from("chat_messages")
    .select("id, role, content, created_at")
    .eq("thread_id", thread_id)
    .order("created_at", { ascending: true });

  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });
  return NextResponse.json({ messages: data ?? [] });
}
