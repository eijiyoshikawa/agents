import type { CSSProperties } from "react";
import { getApptTiming } from "@/lib/data";
import { num } from "@/lib/format";
import { WEEKDAY_JA, DOW_DISPLAY_ORDER } from "@/lib/timing";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function slotLabel(dow: number, hour: number): string {
  return `${WEEKDAY_JA[dow]}曜 ${hour}時台`;
}

// セル濃淡（teal）。0件は極薄、最大値に近いほど濃く。
function cellStyle(count: number, maxCell: number): CSSProperties {
  if (count <= 0 || maxCell <= 0) return { backgroundColor: "rgba(255,255,255,0.03)" };
  const alpha = 0.15 + 0.85 * (count / maxCell);
  return { backgroundColor: `rgba(45,212,191,${alpha.toFixed(3)})` };
}

export default async function TimingPage() {
  const { timing, errors } = await getApptTiming();
  const hours: number[] = [];
  for (let h = timing.hourStart; h <= timing.hourEnd; h++) hours.push(h);
  const maxDow = Math.max(1, ...timing.byDow);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink">アポ獲得タイミング分析</h1>
        <p className="text-xs text-ink-muted mt-0.5">
          「アポイント獲得」の架電記録を、曜日 × 時間帯（JST）で集計。何曜日の何時ごろに獲得しやすいかを可視化します。
          {timing.firstDate && timing.lastDate && (
            <> ／ 対象期間: {timing.firstDate} 〜 {timing.lastDate}</>
          )}
        </p>
      </div>

      {errors.length > 0 && (
        <div className="card p-3 text-xs text-amber-300/90">
          データ取得の注意: {errors.join(" / ")}
        </div>
      )}

      {timing.total === 0 ? (
        <div className="card p-6 text-sm text-ink-muted">
          時刻つきの「アポイント獲得」架電記録がまだありません。
          <br />
          このページは <span className="text-ink">📞架電記録</span> の「結果＝アポイント獲得」かつ
          <span className="text-ink"> 架電日時に時刻が入っている行</span>を集計します。
          アプリの架電フォームから記録したアポは時刻つきで保存されるため、運用が進むと自動で表示されます。
          {timing.excludedNoTime > 0 && (
            <>
              <br />
              （時刻の無いアポ記録 {num(timing.excludedNoTime)} 件は時間帯を特定できないため除外しています）
            </>
          )}
        </div>
      ) : (
        <>
          {/* サマリカード */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard
              label="最も多い曜日"
              value={timing.peakDow != null ? `${WEEKDAY_JA[timing.peakDow]}曜` : "—"}
              sub={timing.peakDow != null ? `${num(timing.byDow[timing.peakDow])}件` : ""}
            />
            <SummaryCard
              label="最も多い時間帯"
              value={timing.peakHour != null ? `${timing.peakHour}時台` : "—"}
              sub={timing.peakHour != null ? `${num(timing.byHour[timing.peakHour])}件` : ""}
            />
            <SummaryCard
              label="ベストな曜日×時間"
              value={timing.topSlots[0] ? slotLabel(timing.topSlots[0].dow, timing.topSlots[0].hour) : "—"}
              sub={timing.topSlots[0] ? `${num(timing.topSlots[0].count)}件` : ""}
            />
            <SummaryCard label="対象アポ数" value={`${num(timing.total)}件`} sub="時刻つきで集計" />
          </div>

          {/* ヒートマップ */}
          <section className="card p-4 overflow-x-auto">
            <h2 className="text-sm font-semibold text-ink mb-3">曜日 × 時間帯 ヒートマップ（濃いほど獲得が多い）</h2>
            <table className="border-separate border-spacing-1 text-center">
              <thead>
                <tr>
                  <th className="text-[11px] text-ink-muted font-medium px-2 sticky left-0 bg-transparent"></th>
                  {hours.map((h) => (
                    <th key={h} className="text-[11px] text-ink-muted font-medium w-10">
                      {h}時
                    </th>
                  ))}
                  <th className="text-[11px] text-ink-muted font-medium px-2">計</th>
                </tr>
              </thead>
              <tbody>
                {DOW_DISPLAY_ORDER.map((d) => (
                  <tr key={d}>
                    <td className="text-xs text-ink-soft font-medium pr-2 whitespace-nowrap">{WEEKDAY_JA[d]}曜</td>
                    {hours.map((h) => {
                      const c = timing.matrix[d][h];
                      return (
                        <td
                          key={h}
                          style={cellStyle(c, timing.maxCell)}
                          className="w-10 h-9 rounded-md text-xs text-ink tabular-nums align-middle"
                          title={`${slotLabel(d, h)}: ${c}件`}
                        >
                          {c > 0 ? c : ""}
                        </td>
                      );
                    })}
                    <td className="text-xs text-ink-soft font-semibold tabular-nums pl-2">{num(timing.byDow[d])}</td>
                  </tr>
                ))}
                {/* 時間帯合計 */}
                <tr>
                  <td className="text-[11px] text-ink-muted pr-2">計</td>
                  {hours.map((h) => (
                    <td key={h} className="text-[11px] text-ink-muted font-medium tabular-nums">
                      {timing.byHour[h] > 0 ? num(timing.byHour[h]) : ""}
                    </td>
                  ))}
                  <td className="text-xs text-ink font-bold tabular-nums pl-2">{num(timing.total)}</td>
                </tr>
              </tbody>
            </table>
            {timing.excludedNoTime > 0 && (
              <p className="text-[11px] text-ink-muted mt-3">
                ※ 時刻の無いアポ記録 {num(timing.excludedNoTime)} 件は時間帯を特定できないため除外しています。
              </p>
            )}
          </section>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* 獲得しやすい曜日×時間 Top5 */}
            <section className="card p-4">
              <h2 className="text-sm font-semibold text-ink mb-3">獲得しやすい 曜日 × 時間帯 Top5</h2>
              <ol className="space-y-1.5">
                {timing.topSlots.map((s, i) => (
                  <li key={`${s.dow}-${s.hour}`} className="flex items-center justify-between text-sm">
                    <span className="text-ink-soft">
                      <span className="text-ink-muted mr-2">{i + 1}.</span>
                      {slotLabel(s.dow, s.hour)}
                    </span>
                    <span className="text-ink font-semibold tabular-nums">{num(s.count)}件</span>
                  </li>
                ))}
              </ol>
            </section>

            {/* 曜日別ランキング（バー） */}
            <section className="card p-4">
              <h2 className="text-sm font-semibold text-ink mb-3">曜日別 アポ獲得</h2>
              <div className="space-y-2">
                {DOW_DISPLAY_ORDER.map((d) => {
                  const v = timing.byDow[d];
                  const w = maxDow > 0 ? Math.round((v / maxDow) * 100) : 0;
                  return (
                    <div key={d} className="flex items-center gap-2 text-xs">
                      <span className="w-8 shrink-0 text-ink-soft">{WEEKDAY_JA[d]}曜</span>
                      <div className="flex-1 h-4 rounded bg-white/[0.04] overflow-hidden">
                        <div className="h-full rounded bg-brand/70" style={{ width: `${w}%` }} />
                      </div>
                      <span className="w-10 text-right tabular-nums text-ink-soft">{num(v)}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-ink-muted">{label}</div>
      <div className="text-lg font-bold text-ink mt-1">{value}</div>
      {sub && <div className="text-[11px] text-ink-muted mt-0.5">{sub}</div>}
    </div>
  );
}
