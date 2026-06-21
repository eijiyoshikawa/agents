import { getModel } from "@/lib/metrics";
import { requireStaff } from "@/lib/auth/server";
import { hasServerSupabase } from "@/lib/db/supabase";
import ServicesClient, { type ServiceRow } from "./client";

export const metadata = { title: "サービス・報酬 — PartnerSales" };

export default async function ServicesPage() {
  await requireStaff();
  const m = await getModel();

  const services: ServiceRow[] = m.services.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description ?? "",
    unitPrice: s.unitPrice ?? 0,
    active: s.active,
    rewards: ([1, 2, 3] as const).map((t) => {
      const r = s.rewards.find((x) => x.tier === t);
      const type = r?.type ?? "percentage";
      const value =
        type === "percentage"
          ? Math.round((r?.rate ?? 0) * 10000) / 100
          : r?.fixedAmount ?? 0;
      return { tier: t, type, value };
    }),
  }));

  return <ServicesClient services={services} configured={hasServerSupabase()} />;
}
