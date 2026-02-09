// src/app/api/ai/process/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createSupabaseServer, supabaseWithServiceRole } from "@/lib/supabaseServer";
import { upsertGoalForUser } from "@/lib/goalHelpers";
import { completeTaskForUser } from "@/lib/taskCompletion";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `
You are a bilingual assistant who chats first. Tools: add_task, complete_task, list_tasks, update_skill, set_goal.

Rules:
1. Always respond conversationally and show empathy.
2. When the user hints at saving/completing something, restate the request and ask whether to record it. Only call tools after explicit confirmation (e.g., yes / please record).
3. When completing tasks, reference the original task title. If the user says "I read", call list_tasks first and confirm which one; if unsure, ask a follow-up question.
4. After a successful tool call, tell the user "Task recorded..." or "Big Goal updated..." and keep task/goal updates separate.
5. No deadlines, no tags, no invented IDs.
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
  },
  {
    type: "function",
    function: {
      name: "set_goal",
      description: "Create or update the user's main goal (Big Goal).",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Goal title" },
          notes: { type: "string" },
          cover_image_url: { type: "string" },
          target_label: { type: "string" },
          target_value: { type: "string" },
          current_label: { type: "string" },
          current_value: { type: "string" },
          progress: { type: "number", description: "0-100" }
        }
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
  const history = body?.messages ?? [];
  const messages: any[] = [{ role: "system", content: SYSTEM_PROMPT }, ...history];
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    messages,
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
      try {
        const result = await completeTaskForUser(user.id, id);
        results.push({ ok: true, tool: "complete_task", ...result });
      } catch (err) {
        results.push({
          error: err instanceof Error ? err.message : String(err),
          tool: "complete_task",
        });
      }
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

    if (name === "set_goal") {
      const goalArgs = args as {
        title?: string;
        notes?: string;
        cover_image_url?: string;
        target_label?: string;
        target_value?: string | number;
        current_label?: string;
        current_value?: string | number;
        progress?: number;
      };
      const { data, error } = await upsertGoalForUser(db, user.id, goalArgs);
      results.push(error ? { error: error.message } : { ok: true, goal: data });
    }
  }

  return NextResponse.json({ tool_results: results });
}
