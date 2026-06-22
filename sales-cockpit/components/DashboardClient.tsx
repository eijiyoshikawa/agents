"use client";

import { useState } from "react";
import clsx from "clsx";
import type { DashboardData } from "@/lib/types";
import { KpiCard } from "./KpiCard";
import { CallsChart, MrrChart, FunnelChart } from "./charts";
import { yen, pct, num } from "@/lib/format";

type Period = "week" | "month";

export default function DashboardClient({ data }: { data: DashboardData }) {
  const [period, setPeriod] = useState<Period>("week");
  const series = period === "week" ? data.weekly : data.monthly;
  const k = data.kpi;

  return (
    <div className="space-y-6">
      {/* ヘッダ + 期間トグル */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink">営業ダッシュボード</h1>
          <p className="text-xs text-ink-muted mt-0.5">
            週次会議用 · 最終更新 {new Date(data.generatedAt).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}
          </p>
        </div>
        <div className="inline-flex rounded-lg bg-ink/[0.05] p-0.5">
          {(["week", "month"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={clsx(
                "px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ease-standard",
                period === p ? "bg-surface text-brand shadow-sm" : "text-ink-muted hover:text-ink",
              )}
            >
              {p === "week" ? "週次" : "月次"}
            </button>
          ))}
        </div>
      </div>

      {data.errors.length > 0 && (
        <div className="card p-4 ring-accent-amber/30 bg-accent-amber/5">
          <div className="text-sm font-semibold text-accent-amber">データ取得の注意</div>
          <ul className="mt-1 text-xs text-ink-soft list-disc list-inside space-y-0.5">
            {data.errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {/* KPIカード */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="今週の架電数" value={num(k.weekCalls)} sub={`アポ ${k.weekAppts}件`} accent="brand" />
        <KpiCard label="今週のアポ率" value={pct(k.weekApptRate)} accent="indigo" />
        <KpiCard label="今月の架電数" value={num(k.monthCalls)} sub={`アポ ${k.monthAppts}件`} accent="brand" />
        <KpiCard label="今月のアポ率" value={pct(k.monthApptRate)} accent="indigo" />
        <KpiCard label="MRR（月次経常収益）" value={yen(k.mrr)} accent="teal" />
        <KpiCard label="稼働中の契約数" value={num(k.activeContracts)} accent="teal" />
        <KpiCard label="今月の新規契約" value={num(k.newContractsThisMonth)} accent="pink" />
        <KpiCard label="今月の総アポ数" value={num(k.monthAppts)} accent="pink" />
      </div>

      {/* 架電推移 */}
      <section className="card p-5">
        <h2 className="text-sm font-semibold text-ink mb-3">
          架電数・アポ率の推移（{period === "week" ? "直近12週" : "直近6ヶ月"}）
        </h2>
        <CallsChart data={series} />
      </section>

      {/* 担当者別 + ファネル */}
      <div className="grid lg:grid-cols-2 gap-6">
        <section className="card p-5">
          <h2 className="text-sm font-semibold text-ink mb-3">担当者別 実績（今月）</h2>
          <RepTable data={data} />
        </section>
        <section className="card p-5">
          <h2 className="text-sm font-semibold text-ink mb-3">パイプライン・ファネル（顧客ステータス）</h2>
          <FunnelChart data={data.funnel} />
        </section>
      </div>

      {/* MRR推移 */}
      <section className="card p-5">
        <h2 className="text-sm font-semibold text-ink mb-3">MRR・稼働契約数の推移（直近6ヶ月）</h2>
        <MrrChart data={data.mrrTrend} />
      </section>
    </div>
  );
}

function RepTable({ data }: { data: DashboardData }) {
  if (data.reps.length === 0) {
    return <p className="text-sm text-ink-muted py-8 text-center">今月の架電データがありません。</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-ink-muted border-b border-ink/[0.07]">
            <th className="text-left font-medium py-2">担当</th>
            <th className="text-right font-medium py-2">架電</th>
            <th className="text-right font-medium py-2">アポ</th>
            <th className="text-right font-medium py-2">アポ率</th>
          </tr>
        </thead>
        <tbody>
          {data.reps.map((r) => (
            <tr key={r.rep} className="border-b border-ink/[0.04] last:border-0">
              <td className="py-2 font-medium text-ink">{r.rep}</td>
              <td className="py-2 text-right tabular-nums">{num(r.calls)}</td>
              <td className="py-2 text-right tabular-nums">{num(r.appointments)}</td>
              <td className="py-2 text-right tabular-nums text-accent-indigo">{pct(r.apptRate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
