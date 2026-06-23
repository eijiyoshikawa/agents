"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import type { Customer } from "@/lib/types";
import CallButton from "./CallButton";

const RANK_COLOR: Record<string, string> = {
  A: "bg-accent-red/10 text-accent-red",
  B: "bg-accent-indigo/10 text-accent-indigo",
  C: "bg-accent-amber/15 text-accent-amber",
  D: "bg-ink/5 text-ink-muted",
};

export default function CustomerTable({ customers }: { customers: Customer[] }) {
  const [q, setQ] = useState("");
  const [rep, setRep] = useState("");
  const [status, setStatus] = useState("");
  const [rank, setRank] = useState("");
  const [industry, setIndustry] = useState("");

  const reps = useMemo(() => uniq(customers.map((c) => c.isRep)), [customers]);
  const statuses = useMemo(() => uniq(customers.map((c) => c.status)), [customers]);
  const ranks = useMemo(() => uniq(customers.map((c) => c.rank)), [customers]);
  const industries = useMemo(() => uniq(customers.map((c) => c.industry)), [customers]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return customers
      .filter((c) => (rep ? c.isRep === rep : true))
      .filter((c) => (status ? c.status === status : true))
      .filter((c) => (rank ? c.rank === rank : true))
      .filter((c) => (industry ? c.industry === industry : true))
      .filter((c) =>
        needle
          ? c.name.toLowerCase().includes(needle) || (c.phone ?? "").includes(needle)
          : true,
      )
      .sort((a, b) => (b.lastCallDate ?? "").localeCompare(a.lastCallDate ?? ""));
  }, [customers, q, rep, status, rank, industry]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="顧客名・電話番号で検索"
          className="flex-1 min-w-48 px-3 py-2 rounded-lg bg-surface ring-1 ring-ink/10 text-sm focus:outline-none focus:ring-brand/40"
        />
        <Select value={rep} onChange={setRep} options={reps} placeholder="IS担当（全員）" />
        <Select value={status} onChange={setStatus} options={statuses} placeholder="ステータス（全て）" />
        <Select value={rank} onChange={setRank} options={ranks} placeholder="見込み度合い（全て）" />
        <Select value={industry} onChange={setIndustry} options={industries} placeholder="業種（全て）" />
      </div>

      <p className="text-xs text-ink-muted">{filtered.length} 件</p>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-ink-muted border-b border-ink/[0.07] bg-surface-alt/50">
              <th className="text-left font-medium px-4 py-2.5">顧客名</th>
              <th className="text-left font-medium px-3 py-2.5">ステータス</th>
              <th className="text-center font-medium px-3 py-2.5">見込</th>
              <th className="text-left font-medium px-3 py-2.5">業種</th>
              <th className="text-left font-medium px-3 py-2.5">IS担当</th>
              <th className="text-right font-medium px-3 py-2.5">架電回数</th>
              <th className="text-left font-medium px-3 py-2.5">最終架電</th>
              <th className="text-right font-medium px-4 py-2.5">発信</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-b border-ink/[0.04] last:border-0 hover:bg-ink/[0.02]">
                <td className="px-4 py-2.5 font-medium text-ink max-w-56 truncate">
                  <a href={c.url} target="_blank" rel="noreferrer" className="hover:text-brand hover:underline">
                    {c.name}
                  </a>
                  {c.phone && <div className="text-xs text-ink-muted font-mono">{c.phone}</div>}
                </td>
                <td className="px-3 py-2.5 text-xs text-ink-soft">{c.status ?? "—"}</td>
                <td className="px-3 py-2.5 text-center">
                  {c.rank && (
                    <span className={clsx("chip", RANK_COLOR[c.rank] ?? "bg-ink/5 text-ink-muted")}>{c.rank}</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-xs text-ink-soft">{c.industry ?? "—"}</td>
                <td className="px-3 py-2.5 text-xs text-ink-soft">{c.isRep ?? "—"}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{c.callCount ?? 0}</td>
                <td className="px-3 py-2.5 text-xs text-ink-muted">{c.lastCallDate?.slice(0, 10) ?? "—"}</td>
                <td className="px-4 py-2.5 text-right">
                  <CallButton phone={c.phone} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function uniq(arr: (string | null)[]): string[] {
  return [...new Set(arr.filter((x): x is string => !!x))].sort();
}

function Select({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-2 rounded-lg bg-surface ring-1 ring-ink/10 text-sm focus:outline-none focus:ring-brand/40"
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}
