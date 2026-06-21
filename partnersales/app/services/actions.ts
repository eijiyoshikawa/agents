"use server";
// サービス・報酬プランの作成／更新／削除（スタッフ専用・service_role）
import { getServerClient, hasServerSupabase } from "@/lib/db/supabase";
import { requireStaff } from "@/lib/auth/server";
import { randomCode } from "@/lib/referral-code";

export interface ServiceActionResult {
  ok: boolean;
  message: string;
}

export interface ServiceRewardInput {
  tier: number;
  type: "percentage" | "fixed";
  /** percentage のときは％値（10 = 10%）、fixed のときは円 */
  value: number;
}

export interface ServiceInput {
  /** 既存なら id あり、新規なら未指定 */
  id?: string;
  name: string;
  description?: string;
  unitPrice?: number;
  active: boolean;
  rewards: ServiceRewardInput[];
}

export async function saveService(input: ServiceInput): Promise<ServiceActionResult> {
  await requireStaff();
  if (!hasServerSupabase()) return { ok: false, message: "Supabase 未設定です" };
  if (!input.name.trim()) return { ok: false, message: "サービス名は必須です" };

  const sb = getServerClient();
  const id = input.id?.trim() || `svc-${randomCode(5).toLowerCase()}`;

  const { error: e1 } = await sb.from("services").upsert({
    id,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    unit_price: Number.isFinite(input.unitPrice) ? Math.round(input.unitPrice as number) : null,
    active: input.active,
  });
  if (e1) return { ok: false, message: e1.message };

  // 報酬プランを入れ替え（tier1〜3）
  await sb.from("service_rewards").delete().eq("service_id", id);
  const rows = input.rewards
    .filter((r) => r.tier >= 1 && r.tier <= 3)
    .map((r) => ({
      service_id: id,
      tier: r.tier,
      type: r.type,
      rate: r.type === "percentage" ? Math.max(0, Math.min(1, r.value / 100)) : null,
      fixed_amount: r.type === "fixed" ? Math.max(0, Math.round(r.value)) : null,
    }));
  const { error: e2 } = await sb.from("service_rewards").insert(rows);
  if (e2) return { ok: false, message: e2.message };

  return { ok: true, message: input.id ? "サービスを更新しました" : "サービスを追加しました" };
}

export async function deleteService(id: string): Promise<ServiceActionResult> {
  await requireStaff();
  if (!hasServerSupabase()) return { ok: false, message: "Supabase 未設定です" };
  const sb = getServerClient();
  const { error } = await sb.from("services").delete().eq("id", id);
  if (error) {
    return { ok: false, message: "削除できません（この成約で使用中の可能性があります）" };
  }
  return { ok: true, message: "サービスを削除しました" };
}
