import { getCalls, getCustomers } from "@/lib/data";
import { jstDateKey } from "@/lib/period";
import { isExcludedRep } from "@/lib/reps";
import { num, pct, rate } from "@/lib/format";
import { KpiCard } from "@/components/KpiCard";
import RefreshButton from "@/components/RefreshButton";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export default async function TodayPage() {
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" }); // YYYY-MM-DD
  const [{ calls, errors: e1 }, { customers, errors: e2 }] = await Promise.all([getCalls(), getCustomers()]);
  const errors = [...e1, ...e2];

  // システム架電記録（参考）: 架電記録DBに本日登録された件数
  const totalCalls = calls.filter((c) => c.date && jstDateKey(c.date) === today).length;

  // 本日の活動（最終更新日ベース）: IS担当が設定された顧客で、最終更新日が本日のもの
  const editedToday = customers.filter(
    (c) => c.isRep && !isExcludedRep(c.isRep) && c.lastEdited && jstDateKey(c.lastEdited) === today,
  );
  // 本日のアポ獲得（取得日が本日）
  const apptsTodayByDate = customers.filter(
    (c) => (c.appointmentDate ?? "").slice(0, 10) === today && !isExcludedRep(c.isRep),
  );

  // 担当者別（活動＝最終更新が本日 / アポ＝取得日が本日）
  const byRepMap = new Map<string, { activity: number; appts: number }>();
  for (const c of editedToday) {
    const rep = c.isRep ?? "未割当";
    const v = byRepMap.get(rep) ?? { activity: 0, appts: 0 };
    v.activity += 1;
    byRepMap.set(rep, v);
  }
  for (const c of apptsTodayByDate) {
    const rep = c.isRep ?? "未割当";
    const v = byRepMap.get(rep) ?? { activity: 0, appts: 0 };
    v.appts += 1;
    byRepMap.set(rep, v);
  }
  const byRep = [...byRepMap.entries()]
    .map(([rep, v]) => ({ rep, ...v }))
    .sort((a, b) => b.activity - a.activity);

  const now = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink">本日の架電・活動</h1>
          <p className="text-xs text-ink-muted mt-0.5">
            {today}（JST）の活動。「活動」はIS担当が設定された顧客の<strong>最終更新日が本日</strong>のもの（架電後にNotionを更新する運用が前提）。
            アポは「アポイント取得日」基準。最終取得 {now}
          </p>
        </div>
        <RefreshButton />
      </div>

      {errors.length > 0 && (
        <div className="card p-4 ring-accent-amber/30 bg-accent-amber/5 text-xs text-ink-soft">{errors.join(" / ")}</div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="本日の活動（最終更新日）" value={num(editedToday.length)} accent="brand" />
        <KpiCard label="本日のアポ獲得（取得日基準）" value={num(apptsTodayByDate.length)} accent="pink" />
        <KpiCard label="システム架電記録（本日）" value={num(totalCalls)} accent="indigo" />
        <KpiCard label="稼働IS担当数" value={num(byRep.length)} accent="amber" />
      </div>

      <section className="card p-5">
        <h2 className="text-sm font-semibold text-ink mb-3">担当者別 本日の活動（最終更新日ベース）</h2>
        {byRep.length === 0 ? (
          <p className="text-sm text-ink-muted py-8 text-center">本日更新された顧客（IS担当あり）はまだありません。</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-ink-muted border-b border-white/10">
                  <th className="text-left font-medium py-2">担当</th>
                  <th className="text-right font-medium py-2">活動</th>
                  <th className="text-right font-medium py-2">アポ</th>
                  <th className="text-right font-medium py-2">アポ率</th>
                </tr>
              </thead>
              <tbody>
                {byRep.map((r) => (
                  <tr key={r.rep} className="border-b border-white/[0.06] last:border-0">
                    <td className="py-2 font-medium text-ink">{r.rep}</td>
                    <td className="py-2 text-right tabular-nums">{num(r.activity)}</td>
                    <td className="py-2 text-right tabular-nums">{num(r.appts)}</td>
                    <td className="py-2 text-right tabular-nums text-accent-indigo">
                      {pct(Number(rate(r.appts, r.activity).toFixed(1)))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card p-5">
        <h2 className="text-sm font-semibold text-ink mb-3">本日アポ獲得した企業（取得日が本日）</h2>
        {apptsTodayByDate.length === 0 ? (
          <p className="text-sm text-ink-muted py-8 text-center">本日アポ取得日の企業はありません。</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-ink-muted border-b border-white/10">
                  <th className="text-left font-medium py-2">企業名</th>
                  <th className="text-left font-medium py-2">ステータス</th>
                  <th className="text-left font-medium py-2">IS担当</th>
                  <th className="text-left font-medium py-2">業種</th>
                </tr>
              </thead>
              <tbody>
                {apptsTodayByDate.map((c) => (
                  <tr key={c.id} className="border-b border-white/[0.06] last:border-0">
                    <td className="py-2 max-w-64 truncate">
                      <a href={c.url} target="_blank" rel="noreferrer" className="text-ink hover:text-brand-glow hover:underline">
                        {c.name}
                      </a>
                    </td>
                    <td className="py-2 text-xs text-ink-soft">{c.status ?? "—"}</td>
                    <td className="py-2 text-xs text-ink-soft">{c.isRep ?? "—"}</td>
                    <td className="py-2 text-xs text-ink-soft">{c.industry ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
