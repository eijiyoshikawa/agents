import Link from "next/link";
import clsx from "clsx";
import { getCalls, getAppointments, getFollowups, getAppointedCustomers, getContracts, getTargets } from "@/lib/data";
import { buildDailyBoard, CALL_RESULTS, APPT_RESULTS, type Period, type RepRow } from "@/lib/daily";
import { DASHBOARD_IS_REPS } from "@/lib/reps";
import { num, pct, rate } from "@/lib/format";
import RefreshButton from "@/components/RefreshButton";
import { AppointmentActions } from "@/components/AppointmentActions";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const PERIODS: { key: Period; label: string }[] = [
  { key: "day", label: "今日" },
  { key: "week", label: "今週" },
  { key: "month", label: "今月" },
];
const WD = ["日", "月", "火", "水", "木", "金", "土"];
const dayLabel = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return `${m}/${d}(${WD[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]})`;
};

export default async function DailyBoardPage({ searchParams }: { searchParams: Promise<{ p?: string; rep?: string }> }) {
  const sp = await searchParams;
  const period: Period = sp.p === "week" || sp.p === "month" ? sp.p : "day";
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
  const [{ calls, errors: e1 }, { appointments, errors: e2 }, { customers: followups, errors: e3 }, { customers: appointed, errors: e4 }, { contracts, errors: e5 }, targets] = await Promise.all([
    getCalls(),
    getAppointments(),
    getFollowups(),
    getAppointedCustomers(),
    getContracts(),
    getTargets(),
  ]);
  const errors = [...e1, ...e2, ...e3, ...e4, ...e5];
  const repFilter = sp.rep && sp.rep !== "all" ? sp.rep : null;
  const board = buildDailyBoard({
    period,
    today,
    calls: repFilter ? calls.filter((c) => (c.rep ?? "未割当") === repFilter) : calls,
    appointments: repFilter ? appointments.filter((a) => (a.rep ?? "未割当") === repFilter) : appointments,
    followups,
    appointedCustomers: appointed,
    contracts,
    targets,
    baseReps: repFilter ? [repFilter] : DASHBOARD_IS_REPS,
  });
  const resultCols = [...CALL_RESULTS, "その他", ...APPT_RESULTS.map((r) => `アポ${r}`)].filter((k) => board.days.some((d) => d.counts[k]));
  const repOptions = Array.from(new Set([...DASHBOARD_IS_REPS, ...board.reps.map((r) => r.rep)])).filter((r) => r !== "未割当");
  const q = (p: Period, rep?: string | null) => `/daily?p=${p}${rep ? `&rep=${encodeURIComponent(rep)}` : ""}`;
  const now = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink">日次ボード</h1>
          <p className="text-xs text-ink-muted mt-0.5">
            {board.range.label}（{board.range.from === board.range.to ? dayLabel(board.range.from) : `${dayLabel(board.range.from)}〜${dayLabel(board.range.to)}`}）。
            架電・アポは「架電結果を記録」の日付、商談実施・リスケは アポ管理の結果を記録した日、新規契約は契約開始日で数えます。最終取得 {now}
          </p>
        </div>
        <RefreshButton />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {PERIODS.map((p) => (
          <Link key={p.key} href={q(p.key, repFilter)} className={clsx("px-3 py-1.5 rounded-lg text-sm", p.key === period ? "bg-brand text-white" : "bg-white/[0.06] text-ink-soft hover:bg-white/10")}>
            {p.label}
          </Link>
        ))}
        <span className="mx-2 text-ink-muted text-xs">担当</span>
        <Link href={q(period)} className={clsx("px-2.5 py-1 rounded-lg text-xs", !repFilter ? "bg-white/15 text-ink" : "bg-white/[0.04] text-ink-soft")}>
          全員
        </Link>
        {repOptions.map((r) => (
          <Link key={r} href={q(period, r)} className={clsx("px-2.5 py-1 rounded-lg text-xs", repFilter === r ? "bg-white/15 text-ink" : "bg-white/[0.04] text-ink-soft")}>
            {r}
          </Link>
        ))}
      </div>

      {errors.length > 0 && <div className="card p-4 ring-accent-amber/30 bg-accent-amber/5 text-xs text-ink-soft">{errors.join(" / ")}</div>}

      {/* 担当者別の実績と目標 */}
      <section className="card p-5">
        <h2 className="text-sm font-semibold text-ink mb-3">{board.range.label}の実績（担当者別）</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-xs text-ink-muted border-b border-white/10">
                <th className="text-left font-medium py-2">担当</th>
                <th className="text-right font-medium py-2">架電（実績/目標）</th>
                <th className="text-right font-medium py-2">接触</th>
                <th className="text-right font-medium py-2">接触率</th>
                <th className="text-right font-medium py-2">アポ獲得</th>
                <th className="text-right font-medium py-2">アポ率</th>
                <th className="text-right font-medium py-2">商談実施</th>
                <th className="text-right font-medium py-2">リスケ</th>
                <th className="text-right font-medium py-2">キャンセル・不在</th>
                <th className="text-right font-medium py-2">新規契約</th>
              </tr>
            </thead>
            <tbody>
              {[...board.reps, board.total].map((r) => (
                <RepLine key={r.rep} r={r} bold={r.rep === "合計"} />
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-ink-muted mt-2">架電目標は「目標設定」の日別目標 × {board.range.label}の営業日数（今日まで）。未設定の担当は「—」。</p>
      </section>

      {/* 今日できていないこと */}
      <section>
        <h2 className="text-sm font-semibold text-ink mb-2">今日できていないこと（{dayLabel(today)}）</h2>
        <div className="grid gap-3 lg:grid-cols-2">
          {board.todos.map((t) => (
            <div key={t.rep} className="card p-4">
              <div className="flex items-baseline justify-between">
                <div className="font-semibold text-ink">{t.rep}</div>
                <span className={clsx("text-xs", t.items.length ? "text-accent-amber" : "text-brand-glow")}>{t.items.length ? `${t.items.length}項目` : "すべて対応済み"}</span>
              </div>
              {t.items.length === 0 ? (
                <p className="text-xs text-ink-muted mt-2">今日やるべきことは残っていません。</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {t.items.map((it, i) => (
                    <li key={i} className="text-sm">
                      <div className={clsx("text-ink-soft", (it.kind === "calls" || it.kind === "outcome") && "text-accent-amber")}>・{it.text}</div>
                      {it.items && it.items.length > 0 && (
                        <ul className="mt-1 ml-3 space-y-0.5">
                          {it.items.slice(0, 8).map((x) => (
                            <li key={x.id + (x.appointmentId ?? "")} className="text-xs">
                              <a href={x.href} className="text-ink hover:text-brand-glow hover:underline">{x.name}</a>
                              {x.note && <span className="text-ink-muted"> {x.note}</span>}
                            </li>
                          ))}
                          {it.items.length > 8 && <li className="text-xs text-ink-muted">ほか {it.items.length - 8}件</li>}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* アポの対応（結果の回答・実施予定日時の入力） */}
      <section className="card p-5">
        <h2 className="text-sm font-semibold text-ink mb-1">アポの対応</h2>
        <p className="text-xs text-ink-muted mb-3">
          予定日を過ぎたアポは結果（実施／リスケ／キャンセル／先方不在）を回答してください。リスケは新しい予定日を入れると、元の予定日とリスケ回数を残して次の予定に切り替わります。
        </p>
        <AppointmentActions
          pending={board.pendingOutcomes.map((a) => ({ id: a.id, name: a.customerName, rep: a.rep, scheduledAt: a.scheduledAt, reschedules: a.reschedules, customerId: a.customerId }))}
          missing={board.missingSchedule.map((a) => ({ id: a.id, name: a.customerName, rep: a.rep, scheduledAt: null, reschedules: a.reschedules, customerId: a.customerId }))}
          unlogged={board.unlogged}
        />
      </section>

      {/* 日別 × 結果 */}
      <section className="card p-5">
        <h2 className="text-sm font-semibold text-ink mb-3">日別の件数（{period === "day" ? "直近14日" : board.range.label}・架電の結果とアポの結果）</h2>
        {resultCols.length === 0 ? (
          <p className="text-sm text-ink-muted py-6 text-center">この期間の記録はありません。</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[880px]">
              <thead>
                <tr className="text-xs text-ink-muted border-b border-white/10">
                  <th className="text-left font-medium py-2">日付</th>
                  <th className="text-right font-medium py-2">架電計</th>
                  {resultCols.map((k) => (
                    <th key={k} className="text-right font-medium py-2 whitespace-nowrap">{k.replace("アポイント獲得", "アポ獲得")}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...board.days].reverse().map((d) => (
                  <tr key={d.date} className={clsx("border-b border-white/[0.06] last:border-0", !d.business && "text-ink-muted")}>
                    <td className="py-1.5 whitespace-nowrap">{dayLabel(d.date)}</td>
                    <td className={clsx("py-1.5 text-right tabular-nums", d.business && d.calls === 0 && "text-accent-red")}>{num(d.calls)}</td>
                    {resultCols.map((k) => (
                      <td key={k} className="py-1.5 text-right tabular-nums">{d.counts[k] ? num(d.counts[k]) : <span className="text-ink-muted">·</span>}</td>
                    ))}
                  </tr>
                ))}
                <tr className="border-t border-white/20 font-semibold">
                  <td className="py-1.5">合計</td>
                  <td className="py-1.5 text-right tabular-nums">{num(board.days.reduce((s, d) => s + d.calls, 0))}</td>
                  {resultCols.map((k) => (
                    <td key={k} className="py-1.5 text-right tabular-nums">{num(board.days.reduce((s, d) => s + (d.counts[k] ?? 0), 0))}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-ink-muted mt-2">平日に架電が 0件の日は赤で表示します。Notionで顧客ステータスだけを変えた架電は日付が残らないため、ここには入りません（「架電結果を記録」から記録してください）。</p>
      </section>
    </div>
  );
}

function RepLine({ r, bold }: { r: RepRow; bold?: boolean }) {
  const short = r.callTarget > 0 && r.calls < r.callTarget;
  return (
    <tr className={clsx("border-b border-white/[0.06] last:border-0", bold && "font-semibold border-t border-white/20")}>
      <td className="py-2 text-ink">{r.rep}</td>
      <td className={clsx("py-2 text-right tabular-nums", short && "text-accent-amber")}>
        {num(r.calls)}
        <span className="text-ink-muted"> / {r.callTarget > 0 ? num(r.callTarget) : "—"}</span>
      </td>
      <td className="py-2 text-right tabular-nums">{num(r.connected)}</td>
      <td className="py-2 text-right tabular-nums">{r.calls ? pct(Number(rate(r.connected, r.calls).toFixed(1))) : "—"}</td>
      <td className="py-2 text-right tabular-nums text-accent-pink">{num(r.appts)}</td>
      <td className="py-2 text-right tabular-nums">{r.calls ? pct(Number(rate(r.appts, r.calls).toFixed(1))) : "—"}</td>
      <td className="py-2 text-right tabular-nums">{num(r.meetings)}</td>
      <td className="py-2 text-right tabular-nums">{num(r.reschedules)}</td>
      <td className="py-2 text-right tabular-nums">{num(r.cancels + r.noShows)}</td>
      <td className="py-2 text-right tabular-nums">{num(r.newContracts)}</td>
    </tr>
  );
}
