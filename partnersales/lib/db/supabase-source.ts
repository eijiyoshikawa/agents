// Supabase をバックエンドとするデータソース。
// DB 行（snake_case）→ ドメイン型（camelCase）へマッピングする。
import type { DataSource } from "./source";
import { getServerClient } from "./supabase";
import type { Deal, Partner, Payout, RatePlan, Service, Tier, TierReward } from "@/lib/types";

interface ServiceRow {
  id: string;
  name: string;
  description: string | null;
  unit_price: number | null;
  active: boolean;
}
interface RewardRow {
  service_id: string;
  tier: number;
  type: "percentage" | "fixed";
  rate: number | null;
  fixed_amount: number | null;
  plan_type?: "agency" | "tossup" | null;
}
interface PartnerRow {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  referral_code: string;
  contact_person: string | null;
  contact_email: string | null;
  joined_at: string;
  status: Partner["status"];
  rate_plan_id: string | null;
}
interface DealRow {
  id: string;
  service_id: string;
  client_name: string;
  introducer_partner_id: string;
  amount: number;
  status: Deal["status"];
  closed_at: string;
  is_self_deal: boolean;
  reward_type: "agency" | "tossup" | null;
  note: string | null;
  reward_snapshot: TierReward[] | null;
}
interface PayoutRow {
  id: string;
  partner_id: string;
  amount: number;
  status: Payout["status"];
  invoice_no: string | null;
  invoiced_at: string | null;
  paid_at: string | null;
  note: string | null;
}

function toReward(r: RewardRow): TierReward {
  return {
    tier: r.tier as Tier,
    type: r.type,
    rate: r.rate ?? undefined,
    fixedAmount: r.fixed_amount ?? undefined,
    planType: r.plan_type ?? undefined,
  };
}

export const supabaseSource: DataSource = {
  name: "supabase",

  async getServices() {
    const sb = getServerClient();
    const [{ data: svc, error: e1 }, { data: rewards, error: e2 }] = await Promise.all([
      sb.from("services").select("*"),
      sb.from("service_rewards").select("*"),
    ]);
    if (e1) throw e1;
    if (e2) throw e2;
    const byService = new Map<string, TierReward[]>();
    for (const r of (rewards ?? []) as RewardRow[]) {
      if (!byService.has(r.service_id)) byService.set(r.service_id, []);
      byService.get(r.service_id)!.push(toReward(r));
    }
    return ((svc ?? []) as ServiceRow[]).map<Service>((s) => ({
      id: s.id,
      name: s.name,
      description: s.description ?? undefined,
      unitPrice: s.unit_price ?? undefined,
      active: s.active,
      rewards: (byService.get(s.id) ?? []).sort((a, b) => a.tier - b.tier),
    }));
  },

  async getPartners() {
    const sb = getServerClient();
    const { data, error } = await sb.from("partners").select("*");
    if (error) throw error;
    return ((data ?? []) as PartnerRow[]).map<Partner>((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      parentId: p.parent_id,
      referralCode: p.referral_code,
      contact: { person: p.contact_person ?? undefined, email: p.contact_email ?? undefined },
      joinedAt: p.joined_at,
      status: p.status,
      ratePlanId: p.rate_plan_id,
    }));
  },

  async getDeals() {
    const sb = getServerClient();
    const { data, error } = await sb.from("deals").select("*");
    if (error) throw error;
    return ((data ?? []) as DealRow[]).map<Deal>((d) => ({
      id: d.id,
      serviceId: d.service_id,
      clientName: d.client_name,
      introducerPartnerId: d.introducer_partner_id,
      amount: d.amount,
      rewardType: d.reward_type ?? undefined,
      status: d.status,
      closedAt: d.closed_at,
      isSelfDeal: d.is_self_deal,
      rewards: d.reward_snapshot ?? undefined,
      note: d.note ?? undefined,
    }));
  },

  async getPayouts() {
    const sb = getServerClient();
    const { data, error } = await sb.from("payouts").select("*");
    if (error) throw error;
    return ((data ?? []) as PayoutRow[]).map<Payout>((p) => ({
      id: p.id,
      partnerId: p.partner_id,
      amount: p.amount,
      status: p.status,
      invoiceNo: p.invoice_no ?? undefined,
      invoicedAt: p.invoiced_at ?? undefined,
      paidAt: p.paid_at ?? undefined,
      note: p.note ?? undefined,
    }));
  },

  async getRatePlans() {
    const sb = getServerClient();
    const [{ data: plans, error: e1 }, { data: rewards, error: e2 }, { data: parts, error: e3 }] =
      await Promise.all([
        sb.from("rate_plans").select("*"),
        sb.from("rate_plan_rewards").select("*"),
        sb.from("partners").select("id, rate_plan_id"),
      ]);
    if (e1) throw e1;
    if (e2) throw e2;
    if (e3) throw e3;

    type PlanRewardRow = RewardRow & { plan_id: string };
    const rewardsByPlan = new Map<string, RatePlan["rewards"]>();
    for (const row of (rewards ?? []) as PlanRewardRow[]) {
      if (!rewardsByPlan.has(row.plan_id)) rewardsByPlan.set(row.plan_id, []);
      rewardsByPlan.get(row.plan_id)!.push({ serviceId: row.service_id, reward: toReward(row) });
    }
    const partnersByPlan = new Map<string, string[]>();
    for (const p of (parts ?? []) as { id: string; rate_plan_id: string | null }[]) {
      if (!p.rate_plan_id) continue;
      if (!partnersByPlan.has(p.rate_plan_id)) partnersByPlan.set(p.rate_plan_id, []);
      partnersByPlan.get(p.rate_plan_id)!.push(p.id);
    }
    return ((plans ?? []) as { id: string; name: string }[]).map<RatePlan>((p) => ({
      id: p.id,
      name: p.name,
      rewards: rewardsByPlan.get(p.id) ?? [],
      partnerIds: partnersByPlan.get(p.id) ?? [],
    }));
  },
};
