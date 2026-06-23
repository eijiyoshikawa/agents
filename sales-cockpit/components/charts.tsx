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

const AXIS = { fontSize: 11, fill: "#7A7A85" };
const PALETTE = ["#0F5132", "#147A4A", "#22C58A", "#5566FF", "#7C3AED", "#EC4899", "#E8A93D", "#2A9D8F", "#E03E3E", "#7A7A85"];

/** 架電数(棒) × アポ率%(折れ線) の複合チャート */
export function CallsChart({ data }: { data: SeriesPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,15,18,.06)" vertical={false} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis yAxisId="l" tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis yAxisId="r" orientation="right" tick={AXIS} tickLine={false} axisLine={false} unit="%" />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: "1px solid rgba(15,15,18,.08)", fontSize: 12 }}
          formatter={(v: number, name: string) => [name === "アポ率" ? `${v}%` : v, name]}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar yAxisId="l" dataKey="calls" name="架電数" fill="#147A4A" radius={[4, 4, 0, 0]} maxBarSize={36} />
        <Bar yAxisId="l" dataKey="appointments" name="アポ数" fill="#EC4899" radius={[4, 4, 0, 0]} maxBarSize={36} />
        <Line yAxisId="r" type="monotone" dataKey="apptRate" name="アポ率" stroke="#5566FF" strokeWidth={2.5} dot={{ r: 3 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/** MRR(棒) × 稼働契約数(折れ線) */
export function MrrChart({ data }: { data: { label: string; mrr: number; active: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,15,18,.06)" vertical={false} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis yAxisId="l" tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v) => `¥${(v / 10000).toFixed(0)}万`} />
        <YAxis yAxisId="r" orientation="right" tick={AXIS} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: "1px solid rgba(15,15,18,.08)", fontSize: 12 }}
          formatter={(v: number, name: string) => [name === "MRR" ? `¥${v.toLocaleString()}` : v, name]}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar yAxisId="l" dataKey="mrr" name="MRR" fill="#0F5132" radius={[4, 4, 0, 0]} maxBarSize={44} />
        <Line yAxisId="r" type="monotone" dataKey="active" name="稼働契約数" stroke="#E8A93D" strokeWidth={2.5} dot={{ r: 3 }} />
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
          contentStyle={{ borderRadius: 12, border: "1px solid rgba(15,15,18,.08)", fontSize: 12 }}
          formatter={(v: number) => [`${v} 件`, "件数"]}
          cursor={{ fill: "rgba(15,15,18,.03)" }}
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
          contentStyle={{ borderRadius: 12, border: "1px solid rgba(15,15,18,.08)", fontSize: 12 }}
          formatter={(v: number) => [`${v} 件`, "件数"]}
          cursor={{ fill: "rgba(15,15,18,.03)" }}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={24} label={{ position: "right", fontSize: 11, fill: "#7A7A85" }}>
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
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,15,18,.06)" vertical={false} />
        <XAxis dataKey="rep" tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis yAxisId="l" tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis yAxisId="r" orientation="right" tick={AXIS} tickLine={false} axisLine={false} unit="%" />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: "1px solid rgba(15,15,18,.08)", fontSize: 12 }}
          formatter={(v: number, name: string) => [name === "達成率" ? `${v}%` : v, name]}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar yAxisId="l" dataKey="target" name="目標" fill="#D8D2C4" radius={[4, 4, 0, 0]} maxBarSize={32} />
        <Bar yAxisId="l" dataKey="calls" name="実績(架電)" fill="#147A4A" radius={[4, 4, 0, 0]} maxBarSize={32} />
        <Line yAxisId="r" type="monotone" dataKey="achievement" name="達成率" stroke="#EC4899" strokeWidth={2.5} dot={{ r: 3 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
