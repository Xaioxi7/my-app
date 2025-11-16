import { NextResponse } from "next/server";
import { createSupabaseServer, supabaseWithServiceRole } from "@/lib/supabaseServer";
import OpenAI from "openai";
import { upsertGoalForUser } from "@/lib/goalHelpers";

const SYSTEM_PROMPT = `
你是一名双语助手（中文/English）。默认像 ChatGPT 一样聊天，只有在用户清楚确认后才调用工具。

规则：
1. 先正常对话，理解需求。
2. 当你认为可以记录任务/Big Goal 时，先询问：“需要我把它记成任务 / Big Goal 吗？” 只有得到肯定答复时才调用工具。
3. 如果用户说“不需要/先不用”，继续聊天，不要说自己已经处理。
4. 工具执行成功后，要在回复里简短说明：例如“任务已记录：xxx”或“Big Goal 已更新：xxx”。
5. 任务与 Big Goal 是两条线；不要混用。所有任务都无截止日期。

Tools: add_task, complete_task, list_tasks, update_skill, set_goal.
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
  {
    type: "function",
    function: {
      name: "set_goal",
      description: "Create or update the Big Goal for the user.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          notes: { type: "string" },
          cover_image_url: { type: "string" },
          target_label: { type: "string" },
          target_value: { type: "string" },
          current_label: { type: "string" },
          current_value: { type: "string" },
          progress: { type: "number", description: "0-100" },
        },
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

  const messages: any[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...(rows ?? []).map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    })),
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
      results.push(error ? { error: error.message, tool: "add_task" } : { ok: true, tool: "add_task", task: data });
    }
    if (name === "complete_task") {
      const { id } = args as { id: string };
      const { data, error } = await db
        .from("tasks").update({ status: "done" })
        .eq("id", id).eq("user_id", user.id)
        .select("*").single();
      results.push(error ? { error: error.message, tool: "complete_task" } : { ok: true, tool: "complete_task", task: data });
    }
    if (name === "list_tasks") {
      const { data, error } = await db
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      results.push(error ? { error: error.message, tool: "list_tasks" } : { ok: true, tool: "list_tasks", tasks: data });
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
      results.push(error ? { error: error.message, tool: "update_skill" } : { ok: true, tool: "update_skill", skill: data });
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
      results.push(error ? { error: error.message, tool: "set_goal" } : { ok: true, tool: "set_goal", goal: data });
    }
  }

  // 写入助手文本（有可能为空——如果全是工具结果也没关系）
  let responseText = assistantText ?? "";
  const summaries = results
    .filter((r) => r && !r.error)
    .map((r) => {
      if (r.tool === "add_task" && r.task?.title) return `任务已记录：「${r.task.title}」`;
      if (r.tool === "complete_task" && r.task?.title) return `已完成任务：「${r.task.title}」`;
      if (r.tool === "set_goal" && r.goal?.title) return `Big Goal 已更新：「${r.goal.title}」`;
      if (r.tool === "update_skill" && r.skill?.name) return `技能 ${r.skill.name} 已更新`;
      return null;
    })
    .filter(Boolean);
  if (!responseText && summaries.length) {
    responseText = summaries.join("\n");
  } else if (responseText && summaries.length) {
    responseText = `${responseText}\n\n${summaries.join("\n")}`;
  }
  if (responseText) {
    await db.from("chat_messages").insert({
      thread_id, user_id: user.id, role: "assistant", content: responseText
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

  return NextResponse.json({ ok: true, reply: responseText || "Done", tool_results: results });
}
