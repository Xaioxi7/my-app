// src/lib/goalHelpers.ts
import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

type GoalInput = {
  title?: string | null;
  notes?: string | null;
  cover_image_url?: string | null;
  target_label?: string | null;
  target_value?: string | number | null;
  current_label?: string | null;
  current_value?: string | number | null;
  progress?: number | null;
};

function cleanString(value?: string | null) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

function normalizeMetric(value?: string | number | null) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const num = Number(trimmed);
    return Number.isNaN(num) ? trimmed : num;
  }
  return undefined;
}

function clampProgress(progress?: number | null) {
  if (typeof progress !== "number" || Number.isNaN(progress)) return undefined;
  return Math.min(100, Math.max(0, Math.round(progress)));
}

function extractMetricFromText(text?: string | null) {
  if (!text) return undefined;
  const match = text
    .replace(/\n/g, " ")
    .match(/([$¥€£])?\s*(-?\d[\d,]*(?:\.\d+)?)/);
  if (!match) return undefined;
  const symbol = match[1] ?? "";
  const numeric = match[2]?.replace(/,/g, "");
  if (!numeric || Number.isNaN(Number(numeric))) return undefined;
  const value = Number(numeric);
  return symbol ? `${symbol}${value}` : value;
}

export async function upsertGoalForUser(
  db: SupabaseClient,
  userId: string,
  input: GoalInput
) {
  const normalized: GoalInput = {
    title: cleanString(input.title),
    notes: cleanString(input.notes),
    cover_image_url: cleanString(input.cover_image_url),
    target_label: cleanString(input.target_label),
    current_label: cleanString(input.current_label),
    target_value: normalizeMetric(input.target_value),
    current_value: normalizeMetric(input.current_value),
    progress: clampProgress(input.progress),
  };

  const patch: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };
  for (const [key, value] of Object.entries(normalized)) {
    if (value !== undefined) {
      patch[key] = value;
    }
  }

  if (
    patch.target_value === undefined &&
    (input?.target_value || input?.notes || input?.title)
  ) {
    const fallback = extractMetricFromText(
      (input.target_value as string) ?? input.notes ?? input.title
    );
    if (fallback !== undefined) {
      patch.target_value = fallback;
      if (!patch.target_label) {
        patch.target_label = "Target";
      }
    }
  }
  if (
    patch.current_value === undefined &&
    (input?.current_value || input?.notes)
  ) {
    const fallback = extractMetricFromText(
      (input.current_value as string) ?? input.notes
    );
    if (fallback !== undefined) {
      patch.current_value = fallback;
      if (!patch.current_label) {
        patch.current_label = "Current";
      }
    }
  }

  const { data: existing } = await db
    .from("goals")
    .select("id")
    .eq("user_id", userId)
    .eq("visible", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    const { data, error } = await db
      .from("goals")
      .update(patch)
      .eq("id", existing.id)
      .select("*")
      .single();
    return { data, error };
  }

  const insertPayload = {
    id: randomUUID(),
    user_id: userId,
    visible: true,
    title: normalized.title ?? "未命名目标",
    notes: normalized.notes ?? null,
    cover_image_url: normalized.cover_image_url ?? null,
    target_label: normalized.target_label ?? "Target",
    target_value: patch.target_value ?? normalized.target_value ?? null,
    current_label: normalized.current_label ?? "Current",
    current_value: patch.current_value ?? normalized.current_value ?? null,
    progress: normalized.progress ?? 0,
    created_at: new Date().toISOString(),
    updated_at: patch.updated_at,
  };
  const { data, error } = await db
    .from("goals")
    .insert(insertPayload)
    .select("*")
    .single();
  return { data, error };
}
