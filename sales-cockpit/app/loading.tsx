import { SkDashboardPage } from "@/components/Skeleton";

// サーバー側のデータ取得中に自動表示されるスケルトン（App Router）。
// ダッシュボード・分析系ページの既定。一覧系ページは各ルートの loading.tsx が優先される。
export default function Loading() {
  return <SkDashboardPage />;
}
