"use client";

import clsx from "clsx";
import type { Breakdowns, Breakdown } from "@/lib/types";
import type { ApptAnalysis, ApptSegment } from "@/lib/db";
import { CategoryBar } from "./chartsDynamic";

// 表示する項目別内訳の定義。ここに1行足すだけで新しい分析軸を追加できる（拡張の土台）。
const FIELDS: { key: keyof Breakdowns; title: string }[] = [
  { key: "rank", title: "見込み度合い（ランク）別" },
  { key: "isRep", title: "IS担当別" },
  { key: "industry", title: "業種別（上位15）" },
  { key: "method", title: "営業手法別" },
  { key: "phase", title: "企業フェーズ別" },
  { key: "pref", title: "都道府県別（上位15）" },
];

// アポ分析の表示軸
const APPT_FIELDS: { key: keyof ApptAnalysis; title: string; note?: string }[] = [
  { key: "emp", title: "従業員数別" },
  { key: "pref", title: "エリア（都道府県）別・アポ数上位15" },
  { key: "industry", title: "業種別・アポ数上位15" },
  { key: "media", title: "掲載元メディア別" },
];

export default function AnalyticsClient({
  breakdowns,
  total,
  errors,
  appt,
}: {
  breakdowns: Breakdowns;
  total: number;
  errors: string[];
  appt?: ApptAnalysis | null;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink">分析</h1>
        <p className="text-xs text-ink-muted mt-0.5">全顧客 {total.toLocaleString()} 件の各項目別 内訳（母集団＝全件）。</p>
      </div>

      {errors.length > 0 && (
        <div className="card p-4 ring-accent-amber/30 bg-accent-amber/5 text-xs text-ink-soft">{errors.join(" / ")}</div>
      )}

      {appt && (
        <section className="space-y-4">
          <div>
            <h2 className="text-base font-bold text-ink">🎯 アポ分析 — どんな企業でアポが取れているか</h2>
            <p className="text-xs text-ink-muted mt-0.5">
              各セグメントのアポ数とアポ率（アポ ÷ コンタクト済み）。アポ率が高いセグメントほど効率よくアポが取れています。
            </p>
          </div>
          <div className="grid lg:grid-cols-2 gap-5">
            {APPT_FIELDS.map((f) => (
              <ApptTable key={f.key} title={f.title} rows={appt[f.key]} />
            ))}
          </div>
          <p className="text-[11px] text-ink-muted">
            ※ 職種（建設業内の細分類）は顧客DBに項目がないため業種までの粒度です。媒体別は複数媒体の企業を各媒体に計上しています。
          </p>
        </section>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {FIELDS.map((f) => {
          const series = breakdowns[f.key] as Breakdown[];
          const sum = series.reduce((s, d) => s + d.count, 0);
          return (
            <section key={f.key} className="card p-5">
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="text-sm font-semibold text-ink">{f.title}</h2>
                <span className="text-xs text-ink-muted">計 {sum.toLocaleString()} 件</span>
              </div>
              <CategoryBar data={series} />
            </section>
          );
        })}
      </div>
    </div>
  );
}

function ApptTable({ title, rows }: { title: string; rows: ApptSegment[] }) {
  const maxAppt = Math.max(1, ...rows.map((r) => r.appointments));
  // 全体アポ率（この軸の合計ベース）。これを上回るセグメントを強調する
  const totC = rows.reduce((s, r) => s + r.contacted, 0);
  const totA = rows.reduce((s, r) => s + r.appointments, 0);
  const avgRate = totC > 0 ? (totA / totC) * 100 : 0;
  return (
    <section className="card p-5">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        <span className="text-xs text-ink-muted">
          アポ計 {totA.toLocaleString()} 件・平均アポ率 {avgRate.toFixed(1)}%
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-ink-muted py-6 text-center">データがありません（初回同期後に表示されます）。</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-ink-muted border-b border-white/10">
              <th className="text-left font-medium py-1.5">セグメント</th>
              <th className="text-right font-medium py-1.5">アポ</th>
              <th className="text-right font-medium py-1.5">コンタクト</th>
              <th className="text-right font-medium py-1.5">アポ率</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-b border-white/[0.06] last:border-0">
                <td className="py-1.5 pr-2">
                  <div className="text-ink text-xs font-medium whitespace-nowrap">{r.label}</div>
                  <div className="h-1 rounded bg-white/[0.06] mt-1">
                    <div
                      className="h-1 rounded bg-brand"
                      style={{ width: `${Math.max(2, (r.appointments / maxAppt) * 100)}%` }}
                    />
                  </div>
                </td>
                <td className="py-1.5 text-right tabular-nums font-semibold text-ink">{r.appointments.toLocaleString()}</td>
                <td className="py-1.5 text-right tabular-nums text-ink-muted text-xs">{r.contacted.toLocaleString()}</td>
                <td
                  className={clsx(
                    "py-1.5 text-right tabular-nums font-semibold",
                    r.rate >= avgRate && r.appointments > 0 ? "text-accent-teal" : "text-ink-soft",
                  )}
                >
                  {r.contacted > 0 ? `${r.rate.toFixed(1)}%` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
