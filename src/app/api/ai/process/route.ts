// src/app/api/ai/process/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createSupabaseServer, supabaseWithServiceRole } from "@/lib/supabaseServer";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `
You manage tasks and skills for the user. Tools: add_task, complete_task, list_tasks, update_skill.
No deadlines. No tags. Keep replies short. Never invent IDs.
`;

// No tags here
const tools = [
  {
    type: "function",
    function: {
      name: "add_task",
      description: "Add a new task (no deadline, no tags).",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" }
        },
        required: ["title"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "complete_task",
      description: "Mark a task as done.",
      parameters: {
        type: "object",
        properties: { id: { type: "string" } },
        required: ["id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_tasks",
      description: "List current user's tasks.",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "update_skill",
      description: "Add points to a skill.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          delta: { type: "number" }
        },
        required: ["name", "delta"]
      }
    }
  }
];

export async function POST(req: NextRequest) {
  const supaAuth = createSupabaseServer();
  const { data: { user } } = await supaAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  // Use any-casts to avoid SDK typing issues; functionality is unaffected
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    messages: [{ role: "system", content: SYSTEM_PROMPT }, ...(body?.messages ?? [])] as any,
    tools: tools as any,
    tool_choice: "auto"
  } as any);

  const message = completion.choices[0].message;
  const calls = message.tool_calls || [];
  const db = supabaseWithServiceRole();

  if (!calls.length) return NextResponse.json({ message });

  const results: any[] = [];
  for (const call of calls) {
    const name = call.function.name;
    const args = JSON.parse(call.function.arguments || "{}");

    if (name === "add_task") {
      const { title } = args as { title: string };
      const { data, error } = await db
        .from("tasks")
        .insert({ user_id: user.id, title, status: "open" }) // ← no tags
        .select("*").single();
      results.push(error ? { error: error.message } : { ok: true, task: data });
    }

    if (name === "complete_task") {
      const { id } = args as { id: string };
      const { data, error } = await db
        .from("tasks")
        .update({ status: "done" })
        .eq("id", id)
        .eq("user_id", user.id)
        .select("*")
        .single();
      results.push(error ? { error: error.message } : { ok: true, task: data });
    }

    if (name === "list_tasks") {
      const { data, error } = await db
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      results.push(error ? { error: error.message } : { ok: true, tasks: data });
    }

    if (name === "update_skill") {
      const { name: skill, delta } = args as { name: string; delta: number };
      const { data: row } = await db
        .from("skills")
        .select("*")
        .eq("user_id", user.id)
        .eq("name", skill)
        .maybeSingle();

      const points = (row?.points ?? 0) + Number(delta || 0);
      const level = Math.floor(points / 100);
      const payload = {
        user_id: user.id,
        name: skill,
        points,
        level,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await db
        .from("skills")
        .upsert(payload, { onConflict: "user_id,name" })
        .select("*")
        .single();
      results.push(error ? { error: error.message } : { ok: true, skill: data });
    }
  }

  return NextResponse.json({ tool_results: results });
}
