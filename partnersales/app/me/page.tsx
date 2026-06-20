import { notFound } from "next/navigation";
import { getModel } from "@/lib/metrics";
import { requirePartner } from "@/lib/auth/server";
import PartnerView from "@/components/PartnerView";

export const metadata = { title: "マイページ — PartnerSales" };

// パートナー本人の専用ダッシュボード（middleware でパートナー限定）。
export default async function MyPage() {
  const session = await requirePartner();
  const m = await getModel();
  const partner = m.partners.find((p) => p.id === session.partnerId);
  if (!partner) notFound();

  return <PartnerView model={m} partner={partner} />;
}
