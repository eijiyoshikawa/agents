import { getDashboard } from "@/lib/data";
import AnalyticsClient from "@/components/AnalyticsClient";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const data = await getDashboard();
  return <AnalyticsClient data={data} />;
}
