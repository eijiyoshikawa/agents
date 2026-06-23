import { getDashboard } from "@/lib/data";
import AnalyticsClient from "@/components/AnalyticsClient";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 大量レコード取得に備えタイムアウトを延長

export default async function AnalyticsPage() {
  const data = await getDashboard();
  return <AnalyticsClient data={data} />;
}
