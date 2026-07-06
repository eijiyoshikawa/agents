import { getDashboard } from "@/lib/data";
import { yen, num, pct } from "@/lib/format";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export default async function ReportPage() {
  const data = await getDashboard();
  const a = data.statusActivity;
  const k = data.kpi;
  const now = new Date().toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" });

  return (
    <div className="space-y-6 print-light">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink">営業レポート</h1>
          <p className="text-xs text-ink-muted mt-0.5">
            集計期間: {data.metricsSince} 以降 ／ 出力日: {now}
          </p>
        </div>
        <PrintButton />
      </div>

      {/* サマリ */}
      <section className="card p-5">
        <h2 className="text-sm font-semibold text-ink mb-3">サマリ</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <Stat label="コンタクト済み" value={num(a.contacted)} />
          <Stat label="アポ獲得" value={num(a.appointments)} />
          <Stat label="アポ率" value={pct(a.apptRate)} />
          <Stat label="今月のアポ獲得" value={num(data.goals.monthlyAppointments.actual)} />
          <Stat label="MRR" value={yen(k.mrr)} />
          <Stat label="稼働契約数" value={num(k.activeContracts)} />
          <Stat label="今月の新規契約" value={num(k.newContractsThisMonth)} />
          <Stat label="目標(アポ)達成率" value={data.goals.monthlyAppointments.achievement != null ? pct(data.goals.monthlyAppointments.achievement) : "—"} />
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        <ReportTable title="担当者別 実績" head={["担当", "コンタクト", "アポ", "アポ率"]}
          rows={a.byRep.map((r) => [r.rep, num(r.contacted), num(r.appointments), pct(r.apptRate)])} />
        <ReportTable title="架電結果の内訳" head={["結果", "件数"]}
          rows={a.byResult.map((r) => [r.label, num(r.count)])} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <ReportTable title="アポ獲得 月次推移（アポ取得日）" head={["月", "アポ数"]}
          rows={a.apptMonthly.map((m) => [m.label, num(m.appointments)])} />
        <ReportTable title="パイプライン・ファネル" head={["段階", "件数"]}
          rows={data.funnel.map((f) => [f.stage, num(f.count)])} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <ReportTable title="MRR・稼働契約 推移" head={["月", "MRR", "稼働契約"]}
          rows={data.mrrTrend.map((m) => [m.label, yen(m.mrr), num(m.active)])} />
        <ReportTable title="目標達成状況" head={["項目", "実績", "目標", "達成率"]}
          rows={[
            ["今月のアポ獲得", num(data.goals.monthlyAppointments.actual), num(data.goals.monthlyAppointments.target), data.goals.monthlyAppointments.achievement != null ? pct(data.goals.monthlyAppointments.achievement) : "—"],
            ["今月の契約数", num(data.goals.monthlyContracts.actual), num(data.goals.monthlyContracts.target), data.goals.monthlyContracts.achievement != null ? pct(data.goals.monthlyContracts.achievement) : "—"],
          ]} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-ink-muted">{label}</div>
      <div className="text-xl font-bold tabular-nums text-ink mt-0.5">{value}</div>
    </div>
  );
}

function ReportTable({ title, head, rows }: { title: string; head: string[]; rows: string[][] }) {
  return (
    <section className="card p-5">
      <h2 className="text-sm font-semibold text-ink mb-3">{title}</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-ink-muted border-b border-white/10">
            {head.map((h, i) => (
              <th key={h} className={i === 0 ? "text-left font-medium py-1.5" : "text-right font-medium py-1.5"}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={head.length} className="text-center text-ink-muted py-4 text-xs">データなし</td>
            </tr>
          ) : (
            rows.map((r, ri) => (
              <tr key={ri} className="border-b border-white/[0.06] last:border-0">
                {r.map((cell, ci) => (
                  <td key={ci} className={ci === 0 ? "py-1.5 text-ink" : "py-1.5 text-right tabular-nums text-ink-soft"}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}
