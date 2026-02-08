import { NextResponse } from "next/server";
import { createSupabaseServer, supabaseWithServiceRole } from "@/lib/supabaseServer";
import { randomUUID } from "crypto";

export async function POST() {
  const supaAuth = createSupabaseServer();
  const { data: { user } } = await supaAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = supabaseWithServiceRole();
  // Reuse the most recent thread; otherwise create a new one
  const { data: latest } = await db
    .from("chat_threads")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latest) {
    return NextResponse.json({ id: latest.id, reused: true });
  }

  const id = randomUUID();
  const { error } = await db.from("chat_threads").insert({
    id, user_id: user.id, updated_at: new Date().toISOString()
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ id, reused: false });
}
