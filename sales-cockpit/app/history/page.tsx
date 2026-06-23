import { getCustomers, getContracts, getCalls } from "@/lib/data";
import { buildMonthlyHistory } from "@/lib/aggregate";
import MonthlyHistoryClient from "@/components/MonthlyHistoryClient";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export default async function HistoryPage() {
  const [{ customers, errors: e1 }, { contracts, errors: e2 }, { calls, errors: e3 }] = await Promise.all([
    getCustomers(),
    getContracts(),
    getCalls(),
  ]);
  const errors = [...e1, ...e2, ...e3];
  const rows = buildMonthlyHistory(customers, contracts, calls, 18);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-ink">月次実績の推移（履歴）</h1>
        <p className="text-xs text-ink-muted mt-0.5">
          毎月16日〜翌月15日を1ヶ月として集計（例: 5/16〜6/15＝5月分）。アポ＝アポ取得日 / 新規契約＝契約開始日 /
          MRR・稼働＝その月に有効な契約 / 架電＝架電記録の日付。列ヘッダーで並び替え可。
        </p>
      </div>

      {errors.length > 0 && (
        <div className="card p-4 ring-accent-amber/30 bg-accent-amber/5 text-xs text-ink-soft">{errors.join(" / ")}</div>
      )}

      <MonthlyHistoryClient rows={rows} />
    </div>
  );
}
