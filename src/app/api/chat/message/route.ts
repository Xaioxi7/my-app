import { NextResponse } from "next/server";
import { createSupabaseServer, supabaseWithServiceRole } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  const supaAuth = createSupabaseServer();
  const { data: { user } } = await supaAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { thread_id, role, content } = body as {
      thread_id: string; role: "user" | "assistant" | "system"; content: string;
    };
    if (!thread_id || !role || typeof content !== "string") {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const db = supabaseWithServiceRole();

    // 验证 thread 属于本人
    const { data: th, error: thErr } = await db
      .from("chat_threads").select("id,user_id").eq("id", thread_id).maybeSingle();
    if (thErr || !th || th.user_id !== user.id) {
      return NextResponse.json({ error: "Invalid thread" }, { status: 400 });
    }

    // 写入消息 + 更新线程时间
    const { data: msg, error } = await db
      .from("chat_messages")
      .insert({ thread_id, user_id: user.id, role, content })
      .select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await db.from("chat_threads")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", thread_id);

    return NextResponse.json({ ok: true, message: msg });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
