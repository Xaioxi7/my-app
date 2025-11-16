import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabaseServer";
import { completeTaskForUser } from "@/lib/taskCompletion";

export async function POST(req: Request) {
  const supaAuth = createSupabaseServer();
  const {
    data: { user },
  } = await supaAuth.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: { task_id?: number | string } = {};
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const taskId = payload.task_id;
  if (!taskId) {
    return NextResponse.json({ error: "task_id is required" }, { status: 400 });
  }

  try {
    const result = await completeTaskForUser(user.id, taskId);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[task-complete]", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
