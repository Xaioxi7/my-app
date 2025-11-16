import OpenAI from "openai";
import { supabaseWithServiceRole } from "@/lib/supabaseServer";

type TaskRow = {
  id: number | string;
  user_id: string;
  title?: string | null;
  status?: string | null;
};

type GoalRow = {
  id: string;
  user_id: string;
  title?: string | null;
  progress?: number | null;
  current_value?: string | number | null;
  target_value?: string | number | null;
  notes?: string | null;
};

type ImpactResult = {
  percent: number;
  currentValueDelta: number;
  reasoning?: string;
};

type SkillImpact = {
  name: string;
  delta: number;
  icon?: string | null;
};

const MIN_IMPACT = 0.1;
const MAX_IMPACT = 10;

const openaiClient = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

function parseNumericMetric(value?: string | number | null) {
  if (typeof value === "number") {
    return { number: value, symbol: "" };
  }
  if (typeof value !== "string") {
    return { number: null, symbol: "" };
  }
  const trimmed = value.trim();
  const symbolMatch = trimmed.match(/^[^\d\-+]+/);
  const symbol = symbolMatch ? symbolMatch[0].trim() : "";
  const numericPart = Number(trimmed.replace(/[^\d\-.]/g, ""));
  return {
    number: Number.isFinite(numericPart) ? numericPart : null,
    symbol,
  };
}

function formatMetric(symbol: string, value: number) {
  const rounded = Math.round(value * 100) / 100;
  const formattedNumber = Number.isFinite(rounded)
    ? rounded.toLocaleString(undefined, { maximumFractionDigits: 2 })
    : value.toString();
  return symbol ? `${symbol}${formattedNumber}` : formattedNumber;
}

function extractMetricByKeyword(notes?: string | null, keyword?: "current" | "target") {
  if (!notes) return undefined;
  const regex =
    keyword === "current"
      ? /current[^$\d\-]*([$¥€£]?\s*-?\d[\d,]*(?:\.\d+)?)/i
      : keyword === "target"
      ? /target[^$\d\-]*([$¥€£]?\s*-?\d[\d,]*(?:\.\d+)?)/i
      : null;
  if (regex) {
    const match = notes.match(regex);
    if (match?.[1]) return match[1].replace(/\s+/g, "");
  }
  const fallback = notes.match(/([$¥€£]?\s*-?\d[\d,]*(?:\.\d+)?)/);
  return fallback?.[1]
    ?.replace(/\s+/g, "")
    ?.replace(/Target|Current|salary|:|,/gi, "")
    ?.trim();
}

function extractMetricFromTitle(text?: string | null) {
  if (!text) return undefined;
  const match = text.match(/([$¥€£])?\s*(-?\d[\d,]*(?:\.\d+)?)/);
  if (!match) return undefined;
  const symbol = match[1] ?? "";
  const numeric = match[2]?.replace(/,/g, "");
  if (!numeric || Number.isNaN(Number(numeric))) return undefined;
  const value = Number(numeric);
  return symbol ? `${symbol}${value}` : value;
}

function detectCurrencySymbol(...texts: (string | null | undefined)[]) {
  for (const text of texts) {
    if (!text) continue;
    const match = text.match(/([$¥€£])/);
    if (match?.[1]) return match[1];
  }
  return "$";
}

async function evaluateTaskImpact(goal: GoalRow, taskTitle: string): Promise<ImpactResult> {
  const fallback: ImpactResult = { percent: 1, currentValueDelta: 0 };
  if (!openaiClient) return fallback;

  try {
    const prompt = `
You estimate how much progress a task contributes toward a user's big goal.
Return a JSON object with: impact_percent (0.1-10), current_value_delta (numeric, can be 0), reasoning.
Goal title: ${goal.title ?? "未命名"}
Goal target value: ${goal.target_value ?? "unknown"}
Goal current value: ${goal.current_value ?? "unknown"}
Current progress: ${goal.progress ?? 0}%
Completed task: ${taskTitle || "Untitled task"}
`;
    const completion = await openaiClient.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You output JSON only. Example: {\"impact_percent\":5.5,\"current_value_delta\":200,\"reasoning\":\"very helpful\"}. Impact must be between 0.1 and 10, never zero.",
        },
        { role: "user", content: prompt },
      ],
    });
    const content = completion.choices?.[0]?.message?.content;
    if (!content) return fallback;
    const parsed = JSON.parse(content);
    const percent = Math.min(
      MAX_IMPACT,
      Math.max(MIN_IMPACT, Number(parsed.impact_percent ?? parsed.percent ?? 1))
    );
    const deltaRaw = Number(parsed.current_value_delta ?? 0);
    const delta = Number.isFinite(deltaRaw) ? deltaRaw : 0;
    return {
      percent,
      currentValueDelta: Math.max(0, delta),
      reasoning: typeof parsed.reasoning === "string" ? parsed.reasoning : undefined,
    };
  } catch (error) {
    console.warn("[impact-eval-fallback]", error);
    return fallback;
  }
}

async function evaluateSkillImpact(goal: GoalRow, taskTitle: string): Promise<SkillImpact | null> {
  if (!openaiClient) {
    return { name: "General Skill", delta: 5, icon: "🌱" };
  }
  try {
    const prompt = `
You determine which single skill benefits the most from the completed task.
Return JSON with: skill_name (short noun phrase), progress_delta (0.5-20), and icon (emoji or short text).
Goal: ${goal.title ?? "未命名目标"}
Completed task: ${taskTitle || "Untitled task"}
Existing skills should remain consistent if the same skill already exists.
`;
    const completion = await openaiClient.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "Output JSON only. Example: {\"skill_name\":\"UX Research\",\"progress_delta\":5.5,\"icon\":\"🧠\"}. progress_delta must be between 0.5 and 20.",
        },
        { role: "user", content: prompt },
      ],
    });
    const content = completion.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content);
    const delta = Math.min(
      20,
      Math.max(0.5, Number(parsed.progress_delta ?? parsed.delta ?? 5))
    );
    const name = String(parsed.skill_name ?? parsed.name ?? "").trim();
    if (!name) return null;
    return {
      name,
      delta,
      icon: parsed.icon ? String(parsed.icon).slice(0, 4) : "🌱",
    };
  } catch (error) {
    console.warn("[skill-eval-fallback]", error);
    return null;
  }
}

export async function completeTaskForUser(userId: string, taskId: string | number) {
  const db = supabaseWithServiceRole();

  const { data: task, error: taskErr } = await db
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .eq("user_id", userId)
    .maybeSingle<TaskRow>();
  if (taskErr) throw new Error(taskErr.message);
  if (!task) throw new Error("任务不存在或无权限。");

  const { data: updatedTask, error: updateErr } = await db
    .from("tasks")
    .update({ status: "done" })
    .eq("id", task.id)
    .eq("user_id", userId)
    .select("*")
    .single<TaskRow>();
  if (updateErr) throw new Error(updateErr.message);

  const { data: goal } = await db
    .from("goals")
    .select("*")
    .eq("user_id", userId)
    .eq("visible", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<GoalRow>();

  if (!goal) {
    return { task: updatedTask };
  }

  const impact = await evaluateTaskImpact(goal, updatedTask.title ?? `Task ${updatedTask.id}`);
  const currentProgress = Number(goal.progress ?? 0);
  const newProgress = Math.min(100, currentProgress + impact.percent);
  const currentMetricRaw =
    goal.current_value ??
    extractMetricByKeyword(goal.notes, "current") ??
    extractMetricFromTitle(goal.title);
  const targetMetricRaw =
    goal.target_value ??
    extractMetricByKeyword(goal.notes, "target") ??
    extractMetricFromTitle(goal.title);
  const metricParts = parseNumericMetric(currentMetricRaw ?? targetMetricRaw);
  const targetParts = parseNumericMetric(targetMetricRaw);
  const symbol = metricParts.symbol || targetParts.symbol || detectCurrencySymbol(goal.title, goal.notes);
  const targetCap = targetParts.number ?? Infinity;

  const contributionAmount =
    impact.percent && targetCap !== Infinity
      ? (targetCap * impact.percent) / 100
      : impact.currentValueDelta;
  const baseNumber =
    metricParts.number ??
    (targetCap !== Infinity ? (targetCap * currentProgress) / 100 : 0);
  const capped = Math.min(baseNumber + contributionAmount, targetCap);
  const formattedCurrentValue = formatMetric(symbol, Math.max(0, capped));

  const goalUpdate: Record<string, any> = {
    progress: newProgress,
    updated_at: new Date().toISOString(),
  };
  goalUpdate.current_value = formattedCurrentValue;
  if (!goal.target_value && targetMetricRaw) {
    goalUpdate.target_value =
      typeof targetMetricRaw === "string"
        ? targetMetricRaw
        : formatMetric(symbol, targetParts.number ?? added);
  }
  const prettyCurrent =
    formattedCurrentValue ??
    (metricParts.number !== null
      ? formatMetric(metricParts.symbol || symbol, metricParts.number)
      : (currentMetricRaw as string | undefined));
  const prettyTarget =
    typeof targetMetricRaw === "string"
      ? targetMetricRaw
      : targetParts.number !== null
      ? formatMetric(targetParts.symbol, targetParts.number)
      : undefined;

  goalUpdate.notes = `Current salary: ${
    prettyCurrent ?? "—"
  }, Target salary: ${prettyTarget ?? "—"}`;

  const { data: updatedGoal, error: goalErr } = await db
    .from("goals")
    .update(goalUpdate)
    .eq("id", goal.id)
    .select("*")
    .single<GoalRow>();

  if (goalErr) throw new Error(goalErr.message);

  const skillImpact = await evaluateSkillImpact(goal, updatedTask.title ?? `Task ${updatedTask.id}`);
  let updatedSkill: any = null;
  if (skillImpact) {
    const { data: existingSkill } = await db
      .from("skills")
      .select("*")
      .eq("user_id", userId)
      .ilike("name", skillImpact.name)
      .limit(1)
      .maybeSingle();

    if (existingSkill) {
      const currentProgress = Number(existingSkill.progress ?? 0);
      const newSkillProgress = Math.min(100, currentProgress + skillImpact.delta);
      const newPoints = (existingSkill.points ?? 0) + Math.round(skillImpact.delta * 10);
      const newLevel = Math.max(1, Math.floor(newPoints / 100) + 1);
      const { data: upSkill } = await db
        .from("skills")
        .update({
          progress: newSkillProgress,
          points: newPoints,
          level: newLevel,
          icon: existingSkill.icon || skillImpact.icon || "🌱",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingSkill.id)
        .eq("user_id", userId)
        .select("*")
        .single();
      updatedSkill = upSkill;
    } else {
      const points = Math.round(skillImpact.delta * 10);
      const level = Math.max(1, Math.floor(points / 100) + 1);
      const { data: newSkill } = await db
        .from("skills")
        .insert({
          user_id: userId,
          name: skillImpact.name,
          progress: skillImpact.delta,
          points,
          level,
          icon: skillImpact.icon || "🌱",
          updated_at: new Date().toISOString(),
        })
        .select("*")
        .single();
      updatedSkill = newSkill;
    }
  }

  return {
    task: updatedTask,
    goal: updatedGoal ?? goal,
    impact,
    skill: updatedSkill,
  };
}
