import { NextResponse } from "next/server";
import { createSupabaseServer, supabaseWithServiceRole } from "@/lib/supabaseServer";

export async function GET(req: Request) {
  const supaAuth = createSupabaseServer();
  const { data: { user } } = await supaAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const thread_id = searchParams.get("thread_id");
  if (!thread_id) return NextResponse.json({ error: "Missing thread_id" }, { status: 400 });

  const db = supabaseWithServiceRole();
  // 权限校验
  const { data: th } = await db.from("chat_threads").select("user_id").eq("id", thread_id).maybeSingle();
  if (!th || th.user_id !== user.id) {
    return NextResponse.json({ error: "Invalid thread" }, { status: 400 });
  }

  const { data: rows, error } = await db
    .from("chat_messages")
    .select("*")
    .eq("thread_id", thread_id)
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ messages: rows ?? [] });
}
