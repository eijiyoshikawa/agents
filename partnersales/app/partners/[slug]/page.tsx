import { notFound } from "next/navigation";
import { getModel } from "@/lib/metrics";
import { requireStaff } from "@/lib/auth/server";
import PartnerView from "@/components/PartnerView";

// スタッフが任意のパートナーを閲覧する（middleware でスタッフ限定）。
export default async function PartnerPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireStaff();
  const { slug } = await params;
  const m = await getModel();
  const partner = m.partners.find((p) => p.slug === slug);
  if (!partner) notFound();

  return <PartnerView model={m} partner={partner} staffView />;
}
