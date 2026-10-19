import { getAnalytics, getApptAnalysis } from "@/lib/data";
import AnalyticsClient from "@/components/AnalyticsClient";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 全件取得に備えタイムアウトを延長

export default async function AnalyticsPage() {
  const [{ breakdowns, total, errors }, appt] = await Promise.all([getAnalytics(), getApptAnalysis()]);
  return (
    <AnalyticsClient
      breakdowns={breakdowns}
      total={total}
      errors={[...errors, ...appt.errors]}
      appt={appt.analysis}
    />
  );
}
