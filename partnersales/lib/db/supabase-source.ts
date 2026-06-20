// Supabase をバックエンドとするデータソース。
// DB 行（snake_case）→ ドメイン型（camelCase）へマッピングする。
import type { DataSource } from "./source";
import { getServerClient } from "./supabase";
import type { Deal, Partner, Payout, Service, Tier, TierReward } from "@/lib/types";

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
  note: string | null;
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
      status: d.status,
      closedAt: d.closed_at,
      isSelfDeal: d.is_self_deal,
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
};
