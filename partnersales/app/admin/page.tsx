import { getModel } from "@/lib/metrics";
import { requireStaff } from "@/lib/auth/server";
import { hasServerSupabase } from "@/lib/db/supabase";
import AdminClient, { type AdminData } from "./client";

export const metadata = { title: "スタッフ管理 — PartnerSales" };

export default async function AdminPage() {
  await requireStaff();
  const m = await getModel();
  const partnerName = (id: string) => m.partners.find((p) => p.id === id)?.name ?? id;
  const serviceName = (id: string) => m.services.find((s) => s.id === id)?.name ?? id;

  const data: AdminData = {
    source: m.source,
    configured: hasServerSupabase(),
    services: m.services.map((s) => ({ id: s.id, name: s.name })),
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
