"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { X, ExternalLink } from "lucide-react";
import type { DashboardData, Goal, DrillCustomer } from "@/lib/types";
import { KpiCard } from "./KpiCard";
import { MrrChart, FunnelChart, CategoryBar } from "./chartsDynamic";
import CallButton from "./CallButton";
import RefreshButton from "./RefreshButton";
import { yen, pct, num } from "@/lib/format";
import { monthKey, currentMonthKey, monthRangeLabel } from "@/lib/period";

type Drill = { title: string; rows: DrillCustomer[] } | null;

export default function DashboardClient({ data }: { data: DashboardData }) {
  const k = data.kpi;
  const a = data.statusActivity;
  const since = data.metricsSince;
  // "2026-05-07" → "5/7以降"（コンタクト済みは累計ではなく当起点以降の集計）
  const sinceLabel = `${Number(since.slice(5, 7))}/${Number(since.slice(8, 10))}以降`;
  const worked = data.workedCustomers;
  const [drill, setDrill] = useState<Drill>(null);

  const apptRows = useMemo(
    () => worked.filter((c) => !!c.appointmentDate && c.appointmentDate.slice(0, 10) >= since),
    [worked, since],
  );
  const curMonth = currentMonthKey();
  const apptThisMonthRows = useMemo(() => {
    // 今月＝締め日基準（16日〜翌月15日）。アポ取得日がその期間内のもの。
    return worked.filter((c) => !!c.appointmentDate && monthKey(c.appointmentDate) === curMonth);
  }, [worked, curMonth]);

  const open = (title: string, rows: DrillCustomer[]) => setDrill({ title, rows });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink">営業ダッシュボード</h1>
          <p className="text-xs text-ink-muted mt-0.5">
            実績は {since} 以降（顧客ステータス基準・数字クリックで内訳表示） · 月次は締め日基準（毎月16日〜翌月15日）。今月＝{curMonth.split("-")[1]}月分（{monthRangeLabel(curMonth)}） · 最終更新{" "}
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

      {/* KPI（クリックで内訳） */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label={`コンタクト済み（${sinceLabel}）`} value={num(a.contacted)} accent="brand" onClick={() => open("コンタクト済み", worked)} />
        <KpiCard label="アポ獲得（アポ取得日基準）" value={num(a.appointments)} accent="pink" onClick={() => open("アポ獲得", apptRows)} />
        <KpiCard label="アポ率（アポ÷コンタクト）" value={pct(a.apptRate)} accent="indigo" />
        <KpiCard label="今月のアポ獲得" value={num(data.goals.monthlyAppointments.actual)} accent="pink" onClick={() => open("今月のアポ獲得", apptThisMonthRows)} />
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
            <div className="text-xs font-medium text-ink-muted">コンタクト済み（{sinceLabel}）</div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-brand">{num(a.contacted)}</div>
            <div className="mt-0.5 text-xs text-ink-muted">アポ率 {pct(a.apptRate)} ・ 全期間累計は分析ページ参照</div>
          </div>
        </div>
        <p className="text-xs text-ink-muted mt-2">
          ※ 架電日が記録されていないため週次/月次の架電推移は表示できません。アポは「アポ取得日」基準です。
        </p>
      </section>

      {/* 担当者別 + 架電結果内訳 */}
      <div className="grid lg:grid-cols-2 gap-6">
        <section className="card p-5">
          <h2 className="text-sm font-semibold text-ink mb-3">担当者別 実績（行クリックで内訳）</h2>
          <RepTable data={data} onPick={(rep) => open(`担当: ${rep}`, worked.filter((c) => (c.isRep ?? "未割当") === rep))} />
        </section>
        <section className="card p-5">
          <h2 className="text-sm font-semibold text-ink mb-3">架電結果の内訳（クリックで企業一覧）</h2>
          <ResultTable
            rows={a.byResult}
            onPick={(status) => open(`結果: ${status}`, worked.filter((c) => c.status === status))}
          />
        </section>
      </div>

      {/* ファネル + アポ月次 */}
      <div className="grid lg:grid-cols-2 gap-6">
        <section className="card p-5">
          <h2 className="text-sm font-semibold text-ink mb-3">パイプライン・ファネル（顧客ステータス）</h2>
          <FunnelChart data={data.funnel} />
        </section>
        <section className="card p-5">
          <h2 className="text-sm font-semibold text-ink mb-3">アポ獲得 月次推移（アポ取得日・直近6ヶ月）</h2>
          <CategoryBar data={a.apptMonthly.map((m) => ({ label: m.label, count: m.appointments }))} />
        </section>
      </div>

      {/* MRR推移 */}
      <section className="card p-5">
        <h2 className="text-sm font-semibold text-ink mb-3">MRR・稼働契約数の推移（直近6ヶ月）</h2>
        <MrrChart data={data.mrrTrend} />
      </section>

      {drill && <DrillPanel drill={drill} onClose={() => setDrill(null)} />}
    </div>
  );
}

function DrillPanel({ drill, onClose }: { drill: { title: string; rows: DrillCustomer[] }; onClose: () => void }) {
  const rows = drill.rows;
  return (
    <div className="fixed inset-0 z-30 flex justify-end bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-2xl h-full bg-night-1 border-l border-white/10 shadow-lift overflow-y-auto animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-night-1/95 backdrop-blur border-b border-white/10 px-5 py-3 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-ink">{drill.title}</h3>
            <p className="text-xs text-ink-muted">{rows.length.toLocaleString()} 件</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-ink-muted hover:bg-white/10">
            <X size={18} />
          </button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-ink-muted border-b border-white/10">
              <th className="text-left font-medium px-5 py-2">会社名</th>
              <th className="text-left font-medium px-2 py-2">ステータス</th>
              <th className="text-left font-medium px-2 py-2">アポ取得日</th>
              <th className="text-left font-medium px-2 py-2">IS担当</th>
              <th className="text-right font-medium px-5 py-2">発信</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 1000).map((c) => (
              <tr key={c.id} className="border-b border-white/[0.06]">
                <td className="px-5 py-2 max-w-56 truncate">
                  <a href={c.url} target="_blank" rel="noreferrer" className="hover:text-brand-glow hover:underline inline-flex items-center gap-1">
                    {c.name}
                    <ExternalLink size={11} className="text-ink-muted" />
                  </a>
                </td>
                <td className="px-2 py-2 text-xs text-ink-soft">{c.status ?? "—"}</td>
                <td className="px-2 py-2 text-xs text-ink-muted">{c.appointmentDate?.slice(0, 10) ?? "—"}</td>
                <td className="px-2 py-2 text-xs text-ink-soft">{c.isRep ?? "—"}</td>
                <td className="px-5 py-2 text-right">{c.phone ? <CallButton phone={c.phone} /> : <span className="text-xs text-ink-muted">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length > 1000 && <p className="text-xs text-ink-muted p-4">先頭1000件を表示しています。</p>}
      </div>
    </div>
  );
}

function ResultTable({ rows, onPick }: { rows: { label: string; count: number }[]; onPick: (status: string) => void }) {
  if (rows.length === 0) return <p className="text-sm text-ink-muted py-8 text-center">データがありません。</p>;
  return (
    <table className="w-full text-sm">
      <tbody>
        {rows.map((r) => (
          <tr
            key={r.label}
            onClick={() => onPick(r.label)}
            className="border-b border-white/[0.06] last:border-0 cursor-pointer hover:bg-white/[0.04]"
          >
            <td className="py-2 text-ink">{r.label}</td>
            <td className="py-2 text-right tabular-nums text-ink-soft">{num(r.count)}</td>
          </tr>
        ))}
      </tbody>
    </table>
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

function RepTable({ data, onPick }: { data: DashboardData; onPick: (rep: string) => void }) {
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
            <tr
              key={r.rep}
              onClick={() => onPick(r.rep)}
              className="border-b border-white/[0.06] last:border-0 cursor-pointer hover:bg-white/[0.04]"
            >
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
