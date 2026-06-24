import { getModel } from "@/lib/metrics";
import { getDataSource } from "@/lib/db";
import { requireStaff } from "@/lib/auth/server";
import { hasServerSupabase } from "@/lib/db/supabase";
import AdminClient, { type AdminData } from "./client";

export const metadata = { title: "スタッフ管理 — PartnerSales" };

const rewardValue = (r?: { type: "percentage" | "fixed"; rate?: number; fixedAmount?: number }) =>
  !r ? 0 : r.type === "percentage" ? Math.round((r.rate ?? 0) * 10000) / 100 : r.fixedAmount ?? 0;

export default async function AdminPage() {
  await requireStaff();
  const m = await getModel();
  const ratePlans = await getDataSource().getRatePlans();
  const partnerName = (id: string) => m.partners.find((p) => p.id === id)?.name ?? id;
  const serviceName = (id: string) => m.services.find((s) => s.id === id)?.name ?? id;

  const data: AdminData = {
    source: m.source,
    configured: hasServerSupabase(),
    services: m.services.map((s) => ({
      id: s.id,
      name: s.name,
      rewards: ([1, 2] as const).map((t) => {
        const r = s.rewards.find((x) => x.tier === t);
        return { tier: t, type: r?.type ?? "percentage", value: rewardValue(r) };
      }),
    })),
    ratePlans: ratePlans.map((p) => ({
      id: p.id,
      name: p.name,
      partnerIds: p.partnerIds,
      rewards: p.rewards.map((r) => ({
        serviceId: r.serviceId,
        tier: r.reward.tier,
        type: r.reward.type,
        value: rewardValue(r.reward),
      })),
    })),
    partners: m.partners.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      referralCode: p.referralCode,
      status: p.status,
    })),
    deals: m.deals.map((d) => ({
      id: d.id,
      clientName: d.clientName,
      serviceName: serviceName(d.serviceId),
      introducer: partnerName(d.introducerPartnerId),
      amount: d.amount,
      status: d.status,
      closedAt: d.closedAt,
      isSelfDeal: Boolean(d.isSelfDeal),
    })),
    payoutRows: [...m.payoutStates.values()].map((s) => ({
      partnerId: s.partnerId,
      name: partnerName(s.partnerId),
      confirmedTotal: s.confirmedTotal,
      paidOut: s.paidOut,
      invoicedAmount: s.invoicedAmount,
      unsettled: s.unsettled,
      phase: s.phase,
    })),
    payouts: m.payouts.map((p) => ({
      id: p.id,
      name: partnerName(p.partnerId),
      amount: p.amount,
      status: p.status,
      invoiceNo: p.invoiceNo,
      paidAt: p.paidAt,
    })),
  };

  return <AdminClient data={data} />;
}
