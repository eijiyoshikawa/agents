"use server";
// 料率パターンの作成／更新／削除と、適用する紹介者の割り当て（スタッフ専用・service_role）
import { getServerClient, hasServerSupabase } from "@/lib/db/supabase";
import { requireStaff } from "@/lib/auth/server";

export interface RateActionResult {
  ok: boolean;
  message: string;
}

export interface RatePlanInput {
  id?: string;
  name: string;
  rewards: { serviceId: string; tier: number; type: "percentage" | "fixed"; value: number }[];
  /** このパターンを適用する紹介者ID */
  partnerIds: string[];
}

export async function saveRatePlan(input: RatePlanInput): Promise<RateActionResult> {
  await requireStaff();
  if (!hasServerSupabase()) return { ok: false, message: "Supabase 未設定です" };
  if (!input.name.trim()) return { ok: false, message: "パターン名は必須です" };
  const sb = getServerClient();

  // プラン本体
  let planId = input.id;
  if (planId) {
    const { error } = await sb.from("rate_plans").update({ name: input.name.trim() }).eq("id", planId);
    if (error) return { ok: false, message: error.message };
  } else {
    const { data, error } = await sb.from("rate_plans").insert({ name: input.name.trim() }).select("id").single();
    if (error || !data) return { ok: false, message: error?.message ?? "作成に失敗しました" };
    planId = data.id;
  }

  // 報酬の入れ替え
  await sb.from("rate_plan_rewards").delete().eq("plan_id", planId);
  const rows = input.rewards
    .filter((r) => r.tier >= 1 && r.tier <= 3)
    .map((r) => ({
      plan_id: planId,
      service_id: r.serviceId,
      tier: r.tier,
      type: r.type,
      rate: r.type === "percentage" ? Math.max(0, Math.min(1, r.value / 100)) : null,
      fixed_amount: r.type === "fixed" ? Math.max(0, Math.round(r.value)) : null,
    }));
  if (rows.length) {
    const { error } = await sb.from("rate_plan_rewards").insert(rows);
    if (error) return { ok: false, message: error.message };
  }

  // 適用紹介者の割り当て（このプランを一旦全解除 → 選択分を再設定）
  await sb.from("partners").update({ rate_plan_id: null }).eq("rate_plan_id", planId);
  if (input.partnerIds.length) {
    const { error } = await sb.from("partners").update({ rate_plan_id: planId }).in("id", input.partnerIds);
    if (error) return { ok: false, message: error.message };
  }

  return { ok: true, message: input.id ? "料率パターンを更新しました" : "料率パターンを作成しました" };
}

export async function deleteRatePlan(id: string): Promise<RateActionResult> {
  await requireStaff();
  if (!hasServerSupabase()) return { ok: false, message: "Supabase 未設定です" };
  const sb = getServerClient();
  const { error } = await sb.from("rate_plans").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: "料率パターンを削除しました" };
}
