"use client";

import type { Breakdowns, Breakdown } from "@/lib/types";
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

export default function AnalyticsClient({
  breakdowns,
  total,
  errors,
}: {
  breakdowns: Breakdowns;
  total: number;
  errors: string[];
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
