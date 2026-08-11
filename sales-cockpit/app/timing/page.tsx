import { getTimingBoard } from "@/lib/data";
import { num, pct } from "@/lib/format";
import { WEEKDAY_JA, MIN_SAMPLE, rateAt, slotLabel, type Grid } from "@/lib/timing";
import Heatmap, { type HeatCell } from "@/components/Heatmap";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export default async function TimingPage() {
  const { board, errors } = await getTimingBoard();
  const hours: number[] = [];
  for (let h = board.hourStart; h <= board.hourEnd; h++) hours.push(h);
  const ins = board.insights;

  // カウント系ヒートマップのセル
  const countCell = (g: Grid, kind: string) => (d: number, h: number): HeatCell => {
    const c = g.matrix[d][h];
    return {
      intensity: g.max > 0 ? c / g.max : 0,
      text: c > 0 ? String(c) : "",
      title: `${slotLabel(d, h)}: ${kind} ${c}件`,
    };
  };
  // 率系ヒートマップのセル（母数 MIN_SAMPLE 未満は「・」で薄く）
  const rateCell = (numG: Grid, kind: string) => (d: number, h: number): HeatCell => {
    const den = board.calls.matrix[d][h];
    const rate = rateAt(numG, board.calls, d, h);
    if (rate == null) {
      return {
        intensity: 0,
        text: den > 0 ? "·" : "",
        title: den > 0 ? `${slotLabel(d, h)}: 母数${den}件（${MIN_SAMPLE}件未満のため率は非表示）` : slotLabel(d, h),
      };
    }
    return {
      intensity: rate,
      text: `${Math.round(rate * 100)}%`,
      title: `${slotLabel(d, h)}: ${kind} ${numG.matrix[d][h]}/${den} = ${pct(rate * 100)}`,
    };
  };
  // 率の 曜日/時間 合計（母数で加重＝行・列の集計率）
  const rateRowTotal = (numG: Grid) => (d: number) =>
    board.calls.byDow[d] >= MIN_SAMPLE ? `${Math.round((numG.byDow[d] / board.calls.byDow[d]) * 100)}%` : "—";
  const rateColTotal = (numG: Grid) => (h: number) =>
    board.calls.byHour[h] >= MIN_SAMPLE ? `${Math.round((numG.byHour[h] / board.calls.byHour[h]) * 100)}%` : "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink">架電・アポ タイミング分析</h1>
        <p className="text-xs text-ink-muted mt-0.5">
          架電記録を 曜日 × 時間帯（JST）で集計。どの時間帯に「架電」「接続」「アポ獲得」が起きやすいかを可視化し、
          時間帯ごとに何をさせるのが効率的かの判断材料にします。
          {board.firstDate && board.lastDate && (
            <> ／ 対象期間: {board.firstDate} 〜 {board.lastDate}</>
          )}
        </p>
      </div>

      {errors.length > 0 && (
        <div className="card p-3 text-xs text-amber-300/90">データ取得の注意: {errors.join(" / ")}</div>
      )}

      {board.calls.total === 0 ? (
        <div className="card p-6 text-sm text-ink-muted">
          時刻つきの架電記録がまだありません。
          <br />
          このページは <span className="text-ink">📞架電記録</span> のうち
          <span className="text-ink"> 架電日時に時刻が入っている行</span>を集計します。
          アプリの架電フォームから記録すると時刻つきで保存されるため、運用が進むと自動で表示されます。
          {board.excludedNoTime > 0 && (
            <>
              <br />（時刻の無いアポ記録 {num(board.excludedNoTime)} 件は時間帯を特定できないため除外しています）
            </>
          )}
        </div>
      ) : (
        <>
          {/* インサイト（何を・いつ） */}
          <section className="card p-5">
            <h2 className="text-sm font-semibold text-ink mb-3">🕒 時間帯の使い方インサイト</h2>
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
              <Insight
                label="📞 架電に最適（つながりやすい）"
                value={ins.bestConnect ? slotLabel(ins.bestConnect.dow, ins.bestConnect.hour) : "データ不足"}
                sub={ins.bestConnect ? `接続率 ${pct(ins.bestConnect.rate * 100)}（${ins.bestConnect.num}/${ins.bestConnect.den}）` : `母数${MIN_SAMPLE}件以上の枠が必要`}
              />
              <Insight
                label="🎯 アポ転換が高い（かけると決まる）"
                value={ins.bestAppt ? slotLabel(ins.bestAppt.dow, ins.bestAppt.hour) : "データ不足"}
                sub={ins.bestAppt ? `アポ率 ${pct(ins.bestAppt.rate * 100)}（${ins.bestAppt.num}/${ins.bestAppt.den}）` : `母数${MIN_SAMPLE}件以上の枠が必要`}
              />
              <Insight
                label="🔥 最もアポが取れている枠"
                value={ins.peakAppt ? slotLabel(ins.peakAppt.dow, ins.peakAppt.hour) : "—"}
                sub={ins.peakAppt ? `${num(ins.peakAppt.count)}件` : ""}
              />
              <Insight
                label="🐢 架電が薄い時間帯（強化余地）"
                value={ins.lowVolumeHours.length ? ins.lowVolumeHours.map((h) => `${h}時`).join("・") : "—"}
                sub="この枠の稼働を増やす余地あり"
              />
            </div>
            <p className="text-[11px] text-ink-muted mt-3">
              使い方の目安: <span className="text-ink-soft">接続率が高い時間＝架電を集中</span>、
              <span className="text-ink-soft">アポ率が高い時間＝エース/重要リードを配置</span>、
              つながりにくい時間はリスト整備・メール・事務作業に回すと効率的です。
            </p>
          </section>

          <HeatSection
            title="① 架電量（現状の行動分布）"
            desc="いま実際に架電できている時間帯。濃いほど架電が多い。"
            hours={hours}
            accent={[45, 212, 191]}
            getCell={countCell(board.calls, "架電")}
            rowTotal={(d) => num(board.calls.byDow[d])}
            colTotal={(h) => (board.calls.byHour[h] > 0 ? num(board.calls.byHour[h]) : "")}
            grandTotal={num(board.calls.total)}
          />

          <HeatSection
            title="② 接続率（電話がつながりやすい時間）"
            desc={`接続(通話成立)÷架電。母数${MIN_SAMPLE}件未満は「・」。ここに架電を集中させる。`}
            hours={hours}
            accent={[56, 189, 248]}
            getCell={rateCell(board.connected, "接続")}
            rowTotal={rateRowTotal(board.connected)}
            colTotal={rateColTotal(board.connected)}
          />

          <HeatSection
            title="③ アポ獲得率（架電がアポに転換しやすい時間）"
            desc={`アポ獲得÷架電。母数${MIN_SAMPLE}件未満は「・」。エースや重要リードを充てる。`}
            hours={hours}
            accent={[251, 191, 36]}
            getCell={rateCell(board.appts, "アポ")}
            rowTotal={rateRowTotal(board.appts)}
            colTotal={rateColTotal(board.appts)}
          />

          <HeatSection
            title="④ アポ獲得数（絶対数）"
            desc="実際にアポが取れた件数。濃いほど多い。"
            hours={hours}
            accent={[52, 211, 153]}
            getCell={countCell(board.appts, "アポ")}
            rowTotal={(d) => num(board.appts.byDow[d])}
            colTotal={(h) => (board.appts.byHour[h] > 0 ? num(board.appts.byHour[h]) : "")}
            grandTotal={num(board.appts.total)}
          />

          {board.excludedNoTime > 0 && (
            <p className="text-[11px] text-ink-muted">
              ※ 時刻の無いアポ記録 {num(board.excludedNoTime)} 件は時間帯を特定できないため集計から除外しています。
            </p>
          )}
        </>
      )}
    </div>
  );
}

function HeatSection(props: {
  title: string;
  desc: string;
  hours: number[];
  accent: [number, number, number];
  getCell: (d: number, h: number) => HeatCell;
  rowTotal?: (d: number) => string;
  colTotal?: (h: number) => string;
  grandTotal?: string;
}) {
  return (
    <section className="card p-4">
      <h2 className="text-sm font-semibold text-ink">{props.title}</h2>
      <p className="text-[11px] text-ink-muted mb-3 mt-0.5">{props.desc}</p>
      <Heatmap
        hours={props.hours}
        accent={props.accent}
        getCell={props.getCell}
        rowTotal={props.rowTotal}
        colTotal={props.colTotal}
        grandTotal={props.grandTotal}
      />
    </section>
  );
}

function Insight({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="text-xs text-ink-muted">{label}</div>
      <div className="text-base font-bold text-ink mt-0.5">{value}</div>
      {sub && <div className="text-[11px] text-ink-muted mt-0.5">{sub}</div>}
    </div>
  );
}
