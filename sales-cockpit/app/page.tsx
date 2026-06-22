import { getDashboard } from "@/lib/data";
import DashboardClient from "@/components/DashboardClient";

// 会議直前でも最新が見えるよう、リクエスト毎にサーバーで Notion を取得する。
export const dynamic = "force-dynamic";

export default async function Page() {
  const data = await getDashboard();
  return <DashboardClient data={data} />;
}
