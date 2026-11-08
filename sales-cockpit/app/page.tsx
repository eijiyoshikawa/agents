import { getDashboard, getCalls, getAppointments, getContracts, getTargets } from "@/lib/data";
import { buildPeriodSummaries } from "@/lib/periods";
import DashboardClient from "@/components/DashboardClient";

// 会議直前でも最新が見えるよう、リクエスト毎にサーバーで Notion を取得する。
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 大量レコード取得に備えタイムアウトを延長

export default async function Page() {
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
  const [data, { calls }, { appointments }, { contracts }, targets] = await Promise.all([getDashboard(), getCalls(), getAppointments(), getContracts(), getTargets()]);
  const periods = buildPeriodSummaries({ today, calls, appointments, contracts, targets });
  return <DashboardClient data={data} periods={periods} />;
}
