"use client";

import type { DashboardData, Goal } from "@/lib/types";
import clsx from "clsx";
import { KpiCard } from "./KpiCard";
import { MrrChart, FunnelChart, CategoryBar } from "./charts";
import { yen, pct, num } from "@/lib/format";

export default function DashboardClient({ data }: { data: DashboardData }) {
  const k = data.kpi;
  const a = data.statusActivity;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink">営業ダッシュボード</h1>
          <p className="text-xs text-ink-muted mt-0.5">
            実績は {data.metricsSince} 以降（顧客ステータス基準） · 最終更新{" "}
            {new Date(data.generatedAt).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}
          </p>
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

      {/* KPI（ステータス基準） */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="コンタクト済み（架電実績）" value={num(a.contacted)} accent="brand" />
        <KpiCard label="アポ獲得（累計）" value={num(a.appointments)} accent="pink" />
        <KpiCard label="アポ率（アポ÷コンタクト）" value={pct(a.apptRate)} accent="indigo" />
        <KpiCard label="今月のアポ獲得" value={num(data.goals.monthlyAppointments.actual)} accent="pink" />
        <KpiCard label="MRR（月次経常収益）" value={yen(k.mrr)} accent="teal" />
        <KpiCard label="稼働中の契約数" value={num(k.activeContracts)} accent="teal" />
        <KpiCard label="今月の新規契約" value={num(k.newContractsThisMonth)} accent="amber" />
      </div>

      {/* 目標達成状況 */}
      <section>
        <h2 className="text-sm font-semibold text-ink mb-2">目標達成状況（今月）</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <GoalCard label="今月のアポ獲得" g={data.goals.monthlyAppointments} />
          <GoalCard label="今月の契約数" g={data.goals.monthlyContracts} />
          <div className="card p-4">
            <div className="text-xs font-medium text-ink-muted">コンタクト済み（累計）</div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-brand">{num(a.contacted)}</div>
            <div className="mt-0.5 text-xs text-ink-muted">アポ率 {pct(a.apptRate)}</div>
          </div>
        </div>
        <p className="text-xs text-ink-muted mt-2">
          ※ 架電日が記録されていないため週次/月次の架電推移は表示できません。日付つきの推移が必要な場合は「📞架電記録」へ日付付きで記録すると自動で集計されます。
        </p>
      </section>

      {/* 担当者別 + 架電結果内訳 */}
      <div className="grid lg:grid-cols-2 gap-6">
        <section className="card p-5">
          <h2 className="text-sm font-semibold text-ink mb-3">担当者別 実績（ステータス基準）</h2>
          <RepTable data={data} />
        </section>
        <section className="card p-5">
          <h2 className="text-sm font-semibold text-ink mb-3">架電結果の内訳</h2>
          <CategoryBar data={a.byResult} />
        </section>
      </div>

      {/* ファネル + アポ月次 */}
      <div className="grid lg:grid-cols-2 gap-6">
        <section className="card p-5">
          <h2 className="text-sm font-semibold text-ink mb-3">パイプライン・ファネル（顧客ステータス）</h2>
          <FunnelChart data={data.funnel} />
        </section>
        <section className="card p-5">
          <h2 className="text-sm font-semibold text-ink mb-3">アポ獲得 月次推移（アポ取得日ベース・直近6ヶ月）</h2>
          <CategoryBar data={a.apptMonthly.map((m) => ({ label: m.label, count: m.appointments }))} />
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

function GoalCard({ label, g }: { label: string; g: Goal }) {
  const color =
    g.achievement == null
      ? "text-ink-muted"
      : g.achievement >= 100
        ? "text-brand"
        : g.achievement >= 70
          ? "text-accent-amber"
          : "text-accent-red";
  return (
    <div className="card p-4 animate-growFromBottom">
      <div className="text-xs font-medium text-ink-muted">{label}</div>
      <div className={clsx("mt-1 text-2xl font-bold tabular-nums", color)}>
        {g.achievement != null ? pct(g.achievement) : "—"}
      </div>
      <div className="mt-0.5 text-xs text-ink-muted">
        {g.target > 0 ? `${num(g.actual)} / ${num(g.target)} 件` : `実績 ${num(g.actual)} 件・目標未設定`}
      </div>
    </div>
  );
}

function RepTable({ data }: { data: DashboardData }) {
  const reps = data.statusActivity.byRep;
  if (reps.length === 0) {
    return <p className="text-sm text-ink-muted py-8 text-center">コンタクト済みのデータがありません。</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-ink-muted border-b border-white/10">
            <th className="text-left font-medium py-2">担当</th>
            <th className="text-right font-medium py-2">コンタクト</th>
            <th className="text-right font-medium py-2">アポ</th>
            <th className="text-right font-medium py-2">アポ率</th>
          </tr>
        </thead>
        <tbody>
          {reps.map((r) => (
            <tr key={r.rep} className="border-b border-white/[0.06] last:border-0">
              <td className="py-2 font-medium text-ink">{r.rep}</td>
              <td className="py-2 text-right tabular-nums">{num(r.contacted)}</td>
              <td className="py-2 text-right tabular-nums">{num(r.appointments)}</td>
              <td className="py-2 text-right tabular-nums text-accent-indigo">{pct(r.apptRate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
