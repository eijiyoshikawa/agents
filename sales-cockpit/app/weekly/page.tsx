import { getDashboard, getSummaryCustomers, getContracts } from "@/lib/data";
import { statsForRange, ranges, ymdLabel, type PeriodStats } from "@/lib/summary";
import { monthLabel, monthRangeLabel, currentMonthKey } from "@/lib/period";
import { num, pct, yen } from "@/lib/format";
import { KpiCard } from "@/components/KpiCard";
import RefreshButton from "@/components/RefreshButton";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export default async function WeeklyPage() {
  const r = ranges();
  const [dash, { customers, errors: e1 }, { contracts, errors: e2 }] = await Promise.all([
    getDashboard(),
    getSummaryCustomers(r.lastMon),
    getContracts(),
  ]);
  const errors = [...e1, ...e2];
  const lastWeek = statsForRange(customers, contracts, r.lastMon, r.lastSun);
  const thisWeek = statsForRange(customers, contracts, r.thisMon, r.today);
  const mk = currentMonthKey();
  const g = dash.goals;
  const now = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink">週次サマリ</h1>
          <p className="text-xs text-ink-muted mt-0.5">
            月曜朝の定例用。活動＝IS担当の最終更新日 / アポ＝アポ取得日 / 契約＝契約開始日（採用SNS・人材紹介）。
            毎週月曜8:00にSlackへ自動投稿・平日18:15に日次をSlack投稿。最終取得 {now}
          </p>
        </div>
        <RefreshButton />
      </div>

      {errors.length > 0 && (
        <div className="card p-4 ring-accent-amber/30 bg-accent-amber/5 text-xs text-ink-soft">{errors.join(" / ")}</div>
      )}

      <WeekSection title={`先週（${ymdLabel(r.lastMon)}〜${ymdLabel(r.lastSun)}）`} s={lastWeek} highlight />
      <WeekSection title={`今週（${ymdLabel(r.thisMon)}〜${ymdLabel(r.today)}・途中）`} s={thisWeek} />

      <section>
        <h2 className="text-sm font-semibold text-ink mb-2">今月（{monthLabel(mk)} {monthRangeLabel(mk)}）進捗</h2>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <GoalMini label="アポ獲得" g={g.monthlyAppointments} />
          <GoalMini label="契約：採用SNS" g={g.monthlyContractsSns} />
          <GoalMini label="契約：人材紹介" g={g.monthlyContractsAgency} />
          <KpiCard label="MRR" value={yen(dash.kpi.mrr)} accent="teal" />
          <KpiCard label="稼働契約数" value={num(dash.kpi.activeContracts)} accent="teal" />
        </div>
      </section>

      <section className="card p-5">
        <h2 className="text-sm font-semibold text-ink mb-3">担当者別 先週の活動（最終更新日ベース）</h2>
        {lastWeek.byRep.length === 0 ? (
          <p className="text-sm text-ink-muted py-6 text-center">先週の活動データがありません。</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-ink-muted border-b border-white/10">
                <th className="text-left font-medium py-2">担当</th>
                <th className="text-right font-medium py-2">活動件数</th>
              </tr>
            </thead>
            <tbody>
              {lastWeek.byRep.map((rep) => (
                <tr key={rep.rep} className="border-b border-white/[0.06] last:border-0">
                  <td className="py-2 font-medium text-ink">{rep.rep}</td>
                  <td className="py-2 text-right tabular-nums">{num(rep.count)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function WeekSection({ title, s, highlight }: { title: string; s: PeriodStats; highlight?: boolean }) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-ink mb-2">{title}</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="活動（最終更新日）" value={num(s.activity)} accent={highlight ? "brand" : "indigo"} />
        <KpiCard label="アポ獲得" value={num(s.appts)} accent="pink" />
        <KpiCard label="新規契約：採用SNS" value={num(s.newSns)} accent="amber" />
        <KpiCard label="新規契約：人材紹介" value={num(s.newAgency)} accent="amber" />
      </div>
    </section>
  );
}

function GoalMini({ label, g }: { label: string; g: { actual: number; target: number; achievement: number | null } }) {
  const color =
    g.achievement == null ? "text-ink" : g.achievement >= 100 ? "text-brand" : g.achievement >= 70 ? "text-accent-amber" : "text-accent-red";
  return (
    <div className="card p-4">
      <div className="text-xs font-medium text-ink-muted">{label}</div>
      <div className={`mt-1 text-2xl font-bold tabular-nums ${color}`}>
        {g.achievement != null ? pct(g.achievement) : num(g.actual)}
      </div>
      <div className="mt-0.5 text-xs text-ink-muted">
        {g.target > 0 ? `${num(g.actual)} / ${num(g.target)} 件` : `実績 ${num(g.actual)} 件`}
      </div>
    </div>
  );
}
