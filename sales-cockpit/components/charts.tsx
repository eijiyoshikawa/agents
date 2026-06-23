"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Cell,
} from "recharts";
import type { SeriesPoint, FunnelStage, Breakdown, RepStat } from "@/lib/types";

const AXIS = { fontSize: 11, fill: "#8FA1BE" };
const TOOLTIP = { borderRadius: 12, border: "1px solid rgba(255,255,255,.12)", background: "#0E1F40", color: "#EAF1FB", fontSize: 12 } as const;
const PALETTE = ["#3B82F6", "#60A5FA", "#7DD3FC", "#818CF8", "#A78BFA", "#F472B6", "#FBBF24", "#2DD4BF", "#F87171", "#94A3B8"];

/** 架電数(棒) × アポ率%(折れ線) の複合チャート */
export function CallsChart({ data }: { data: SeriesPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.08)" vertical={false} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis yAxisId="l" tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis yAxisId="r" orientation="right" tick={AXIS} tickLine={false} axisLine={false} unit="%" />
        <Tooltip
          contentStyle={TOOLTIP}
          formatter={(v: number, name: string) => [name === "アポ率" ? `${v}%` : v, name]}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar yAxisId="l" dataKey="calls" name="架電数" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={36} />
        <Bar yAxisId="l" dataKey="appointments" name="アポ数" fill="#F472B6" radius={[4, 4, 0, 0]} maxBarSize={36} />
        <Line yAxisId="r" type="monotone" dataKey="apptRate" name="アポ率" stroke="#7DD3FC" strokeWidth={2.5} dot={{ r: 3 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/** MRR(棒) × 稼働契約数(折れ線) */
export function MrrChart({ data }: { data: { label: string; mrr: number; active: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.08)" vertical={false} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis yAxisId="l" tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v) => `¥${(v / 10000).toFixed(0)}万`} />
        <YAxis yAxisId="r" orientation="right" tick={AXIS} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={TOOLTIP}
          formatter={(v: number, name: string) => [name === "MRR" ? `¥${v.toLocaleString()}` : v, name]}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar yAxisId="l" dataKey="mrr" name="MRR" fill="#2DD4BF" radius={[4, 4, 0, 0]} maxBarSize={44} />
        <Line yAxisId="r" type="monotone" dataKey="active" name="稼働契約数" stroke="#FBBF24" strokeWidth={2.5} dot={{ r: 3 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/** ファネル（横棒） */
export function FunnelChart({ data }: { data: FunnelStage[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 24, bottom: 0 }}>
        <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="stage" tick={AXIS} tickLine={false} axisLine={false} width={64} />
        <Tooltip
          contentStyle={TOOLTIP}
          formatter={(v: number) => [`${v} 件`, "件数"]}
          cursor={{ fill: "rgba(255,255,255,.05)" }}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={28}>
          {data.map((d) => (
            <Cell key={d.stage} fill={d.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** 汎用カテゴリ内訳（横棒）。任意の項目別 件数 を描画する分析用の土台。 */
export function CategoryBar({ data, height = 260 }: { data: Breakdown[]; height?: number }) {
  if (data.length === 0) return <p className="text-sm text-ink-muted py-8 text-center">データなし</p>;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 28, left: 8, bottom: 0 }}>
        <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
        <YAxis type="category" dataKey="label" tick={AXIS} tickLine={false} axisLine={false} width={92} />
        <Tooltip
          contentStyle={TOOLTIP}
          formatter={(v: number) => [`${v} 件`, "件数"]}
          cursor={{ fill: "rgba(255,255,255,.05)" }}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={24} label={{ position: "right", fontSize: 11, fill: "#8FA1BE" }}>
          {data.map((d, i) => (
            <Cell key={d.label} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** 担当者別 目標 vs 実績（架電数）。目標達成率の可視化。 */
export function TargetChart({ reps }: { reps: RepStat[] }) {
  const data = reps.filter((r) => r.target > 0);
  if (data.length === 0) {
    return (
      <p className="text-sm text-ink-muted py-8 text-center">
        目標が未設定です。IS架電KPI の「月次目標架電数」か config/targets.json を設定してください。
      </p>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.08)" vertical={false} />
        <XAxis dataKey="rep" tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis yAxisId="l" tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis yAxisId="r" orientation="right" tick={AXIS} tickLine={false} axisLine={false} unit="%" />
        <Tooltip
          contentStyle={TOOLTIP}
          formatter={(v: number, name: string) => [name === "達成率" ? `${v}%` : v, name]}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar yAxisId="l" dataKey="target" name="目標" fill="#334569" radius={[4, 4, 0, 0]} maxBarSize={32} />
        <Bar yAxisId="l" dataKey="calls" name="実績(架電)" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={32} />
        <Line yAxisId="r" type="monotone" dataKey="achievement" name="達成率" stroke="#F472B6" strokeWidth={2.5} dot={{ r: 3 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
