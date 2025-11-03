import { NextResponse } from "next/server";
import { createSupabaseServer, supabaseWithServiceRole } from "@/lib/supabaseServer";
import OpenAI from "openai";

const SYSTEM_PROMPT = `
You chat freely and can also manage tasks/skills with tools when needed.
Rules: No deadlines. No tags. Keep replies short. Never invent IDs.
Tools: add_task, complete_task, list_tasks, update_skill.
`;

const tools = [
  {
    type: "function",
    function: {
      name: "add_task",
      description: "Add a new task (no deadline, no tags).",
      parameters: {
        type: "object",
        properties: { title: { type: "string" } },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "complete_task",
      description: "Mark a task as done.",
      parameters: {
        type: "object",
        properties: { id: { type: "string" } },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_tasks",
      description: "List current user's tasks.",
      parameters: { type: "object", properties: {} },
    },
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
          delta: { type: "number" },
        },
        required: ["name", "delta"],
      },
    },
  },
];

export async function POST(req: Request) {
  const supaAuth = createSupabaseServer();
  const { data: { user } } = await supaAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const thread_id = searchParams.get("thread_id");
  if (!thread_id) return NextResponse.json({ error: "Missing thread_id" }, { status: 400 });

  const db = supabaseWithServiceRole();
  // 验证线程归属
  const { data: th } = await db.from("chat_threads").select("user_id").eq("id", thread_id).maybeSingle();
  if (!th || th.user_id !== user.id) {
    return NextResponse.json({ error: "Invalid thread" }, { status: 400 });
  }

  // 取历史消息 -> 转换为 OpenAI messages
  const { data: rows, error: hisErr } = await db
    .from("chat_messages")
    .select("*")
    .eq("thread_id", thread_id)
    .order("created_at", { ascending: true });
  if (hisErr) return NextResponse.json({ error: hisErr.message }, { status: 500 });

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...(rows ?? []).map((m) => ({ role: m.role as "user" | "assistant" | "system", content: m.content })),
  ];

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

  // 生成回复（带工具）
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    messages: messages as any,
    tools: tools as any,
    tool_choice: "auto",
  } as any);

  const choice = completion.choices[0];
  const assistantText = choice.message.content ?? "";
  const toolCalls = choice.message.tool_calls ?? [];
  const results: any[] = [];

  // 如有工具调用 -> 执行
  for (const call of toolCalls) {
    const name = call.function.name;
    const args = JSON.parse(call.function.arguments || "{}");
    if (name === "add_task") {
      const { title } = args as { title: string };
      const { data, error } = await db
        .from("tasks")
        .insert({ user_id: user.id, title, status: "open" })
        .select("*").single();
      results.push(error ? { error: error.message } : { ok: true, task: data });
    }
    if (name === "complete_task") {
      const { id } = args as { id: string };
      const { data, error } = await db
        .from("tasks").update({ status: "done" })
        .eq("id", id).eq("user_id", user.id)
        .select("*").single();
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
        .from("skills").select("*")
        .eq("user_id", user.id).eq("name", skill).maybeSingle();
      const points = (row?.points ?? 0) + Number(delta || 0);
      const level = Math.floor(points / 100);
      const payload = {
        user_id: user.id, name: skill, points, level, updated_at: new Date().toISOString()
      };
      const { data, error } = await db
        .from("skills").upsert(payload, { onConflict: "user_id,name" })
        .select("*").single();
      results.push(error ? { error: error.message } : { ok: true, skill: data });
    }
  }

  // 写入助手文本（有可能为空——如果全是工具结果也没关系）
  if (assistantText && typeof assistantText === "string") {
    await db.from("chat_messages").insert({
      thread_id, user_id: user.id, role: "assistant", content: assistantText
    });
  } else if (results.length) {
    // 如果没有自然语言，但执行了工具；给一个简短回执
    await db.from("chat_messages").insert({
      thread_id, user_id: user.id, role: "assistant",
      content: "已处理你的指令 ✅（任务/技能已更新）。"
    });
  } else {
    // 什么都没发生，给个空回执，避免前端无显示
    await db.from("chat_messages").insert({
      thread_id, user_id: user.id, role: "assistant",
      content: "（好的）"
    });
  }

  // 更新线程时间
  await db.from("chat_threads")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", thread_id);

  return NextResponse.json({ ok: true, reply: assistantText || "Done", tool_results: results });
}
