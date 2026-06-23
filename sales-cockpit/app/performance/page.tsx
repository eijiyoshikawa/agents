import { getCalls } from "@/lib/data";
import { getCallTargets } from "@/lib/notion";
import { monthColumns, periodKeyOf, currentMonthKey } from "@/lib/period";
import { num, pct, rate } from "@/lib/format";
import PerfControls from "@/components/PerfControls";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function str(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

export default async function PerformancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const type: "日次" | "週次" = str(sp.type) === "週次" ? "週次" : "日次";
  const month = /^\d{4}-\d{2}$/.test(str(sp.month)) ? str(sp.month) : currentMonthKey();

  const cols = monthColumns(type, month);
  const colKeys = new Set(cols.map((c) => c.key));
  const [{ calls, errors }, targets] = await Promise.all([
    getCalls(),
    getCallTargets(type, month).catch(() => ({} as Record<string, Record<string, number>>)),
  ]);

  // 実績バケット: rep -> key -> 件数
  const actual: Record<string, Record<string, number>> = {};
  for (const c of calls) {
    if (!c.rep || !c.date) continue;
    const key = periodKeyOf(type, c.date);
    if (!key || !colKeys.has(key)) continue;
    (actual[c.rep] ??= {})[key] = ((actual[c.rep] ??= {})[key] ?? 0) + 1;
  }

  const reps = [...new Set([...Object.keys(targets), ...Object.keys(actual)])].sort();
  const sum = (o: Record<string, number> | undefined) => Object.values(o ?? {}).reduce((s, v) => s + v, 0);
  const totalTarget = reps.reduce((s, r) => s + sum(targets[r]), 0);
  const totalActual = reps.reduce((s, r) => s + sum(actual[r]), 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-ink">目標 vs 実績（架電）</h1>
        <p className="text-xs text-ink-muted mt-0.5">
          目標設定の{type}目標と、架電記録（日付つき）の実績を突合。{month}：実績 {num(totalActual)} / 目標 {num(totalTarget)}（達成率{" "}
          {totalTarget > 0 ? pct(Number(rate(totalActual, totalTarget).toFixed(0))) : "—"}）
        </p>
      </div>

      <PerfControls type={type} month={month} />

      {errors.length > 0 && (
        <div className="card p-4 ring-accent-amber/30 bg-accent-amber/5 text-xs text-ink-soft">{errors.join(" / ")}</div>
      )}

      {reps.length === 0 ? (
        <div className="card p-8 text-center text-sm text-ink-muted">
          この月の目標・実績がありません。目標設定で{type}目標を登録し、架電結果を記録すると突合できます。
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="text-sm border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-surface text-left text-xs text-ink-muted font-medium px-3 py-2 min-w-24">担当</th>
                {cols.map((c) => (
                  <th key={c.key} className="text-xs text-ink-muted font-medium px-1 py-2 text-center whitespace-nowrap">
                    {c.label}
                  </th>
                ))}
                <th className="text-xs text-ink-muted font-medium px-3 py-2 text-right">実績/目標</th>
                <th className="text-xs text-ink-muted font-medium px-3 py-2 text-right">達成率</th>
              </tr>
            </thead>
            <tbody>
              {reps.map((rep) => {
                const t = sum(targets[rep]);
                const a = sum(actual[rep]);
                const ach = t > 0 ? Number(rate(a, t).toFixed(0)) : null;
                return (
                  <tr key={rep}>
                    <td className="sticky left-0 z-10 bg-night-1 text-ink font-medium px-3 py-1.5 whitespace-nowrap">{rep}</td>
                    {cols.map((c) => {
                      const av = actual[rep]?.[c.key] ?? 0;
                      const tv = targets[rep]?.[c.key] ?? 0;
                      const hit = tv > 0 && av >= tv;
                      return (
                        <td
                          key={c.key}
                          className={`px-1 py-1.5 text-center text-xs tabular-nums ${hit ? "text-brand-glow" : av > 0 ? "text-ink" : "text-ink-muted/50"}`}
                          title={`実績${av} / 目標${tv}`}
                        >
                          {av}/{tv}
                        </td>
                      );
                    })}
                    <td className="px-3 py-1.5 text-right tabular-nums text-ink-soft">
                      {num(a)} / {num(t)}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {ach != null ? (
                        <span className={ach >= 100 ? "text-brand" : ach >= 70 ? "text-accent-amber" : "text-accent-red"}>{ach}%</span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-ink-muted">
        ※ 実績は「📞架電記録」の日付つき行を集計します。架電リストの「架電結果を記録」で日々記録すると、ここに反映されます。
      </p>
    </div>
  );
}
