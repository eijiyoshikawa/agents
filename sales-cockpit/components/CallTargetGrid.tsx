"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";

type Detail = Record<string, number>;
type Data = Record<string, Detail>;
type StrData = Record<string, Record<string, string>>;

const pad = (n: number) => String(n).padStart(2, "0");

function toStr(data: Data): StrData {
  const out: StrData = {};
  for (const [rep, d] of Object.entries(data)) {
    out[rep] = {};
    for (const [k, v] of Object.entries(d)) out[rep][k] = String(v);
  }
  return out;
}

/** 対象月の列（日次=各日 / 週次=各週の月曜） */
function columnsFor(type: "日次" | "週次", month: string): { key: string; label: string }[] {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return [];
  const last = new Date(y, m, 0).getDate();
  if (type === "日次") {
    return Array.from({ length: last }, (_, i) => {
      const d = i + 1;
      return { key: `${month}-${pad(d)}`, label: String(d) };
    });
  }
  // 週次: 月内の各週（月曜起点）
  const cols: { key: string; label: string }[] = [];
  const first = new Date(y, m - 1, 1);
  const day = first.getDay();
  const offsetToMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(y, m - 1, 1 - offsetToMonday);
  while (monday <= new Date(y, m - 1, last)) {
    cols.push({ key: `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`, label: `${monday.getMonth() + 1}/${monday.getDate()}週` });
    monday.setDate(monday.getDate() + 7);
  }
  return cols;
}

export default function CallTargetGrid({
  reps,
  initialType,
  initialMonth,
  initialData,
}: {
  reps: string[];
  initialType: "日次" | "週次";
  initialMonth: string;
  initialData: Data;
}) {
  const [type, setType] = useState<"日次" | "週次">(initialType);
  const [month, setMonth] = useState(initialMonth);
  const [viewRep, setViewRep] = useState<string>("all");
  const [data, setData] = useState<StrData>(toStr(initialData));
  const [bulk, setBulk] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "saving" | "saved" | "error">("idle");
  const [err, setErr] = useState("");

  const cols = useMemo(() => columnsFor(type, month), [type, month]);
  const shownReps = viewRep === "all" ? reps : reps.filter((r) => r === viewRep);

  // 種別・対象月の変更で再取得
  useEffect(() => {
    let abort = false;
    const load = async () => {
      setState("loading");
      try {
        const res = await fetch(`/api/call-targets?type=${encodeURIComponent(type)}&month=${month}`);
        const j = await res.json();
        if (abort) return;
        setData(toStr(j.data ?? {}));
        setState("idle");
      } catch {
        if (!abort) setState("idle");
      }
    };
    // 初期表示（initialと同一）はスキップ
    if (type !== initialType || month !== initialMonth) load();
    return () => {
      abort = true;
    };
  }, [type, month, initialType, initialMonth]);

  const setCell = (rep: string, key: string, val: string) =>
    setData((d) => ({ ...d, [rep]: { ...(d[rep] ?? {}), [key]: val } }));

  const applyBulk = (targetReps: string[]) => {
    const v = bulk.trim();
    setData((d) => {
      const next = { ...d };
      for (const rep of targetReps) {
        const row = { ...(next[rep] ?? {}) };
        for (const c of cols) row[c.key] = v;
        next[rep] = row;
      }
      return next;
    });
  };

  const rowTotal = (rep: string) => cols.reduce((s, c) => s + (Number(data[rep]?.[c.key]) || 0), 0);

  const save = async () => {
    setState("saving");
    setErr("");
    const byRep: Data = {};
    for (const rep of reps) {
      const row: Detail = {};
      for (const c of cols) {
        const n = Number(data[rep]?.[c.key]);
        if (Number.isFinite(n) && n > 0) row[c.key] = n;
      }
      byRep[rep] = row;
    }
    try {
      const res = await fetch("/api/call-targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, month, byRep }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "保存失敗");
      setState("saved");
    } catch (e: any) {
      setState("error");
      setErr(e?.message ?? "保存失敗");
    }
  };

  return (
    <section className="card p-5 space-y-4">
      <h2 className="text-sm font-semibold text-ink">担当者別 架電目標（日次・週次）</h2>

      {/* コントロール */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg bg-white/[0.06] p-0.5">
          {(["日次", "週次"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={clsx("px-3 py-1.5 rounded-md text-sm font-medium", type === t ? "bg-surface text-brand-glow" : "text-ink-muted")}
            >
              {t}
            </button>
          ))}
        </div>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="px-3 py-2 rounded-lg bg-night-1 ring-1 ring-white/10 text-sm focus:outline-none focus:ring-brand-glow/50"
        />
        <select
          value={viewRep}
          onChange={(e) => setViewRep(e.target.value)}
          className="px-3 py-2 rounded-lg bg-surface ring-1 ring-white/10 text-sm focus:outline-none focus:ring-brand-glow/50"
        >
          <option value="all">全担当を表示</option>
          {reps.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        {state === "loading" && <span className="text-xs text-ink-muted">読み込み中…</span>}
      </div>

      {/* 一括入力 */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg bg-white/[0.04] p-2">
        <span className="text-xs text-ink-muted">一括入力：</span>
        <input
          value={bulk}
          onChange={(e) => setBulk(e.target.value)}
          inputMode="numeric"
          placeholder="件数"
          className="w-24 px-3 py-1.5 rounded-lg bg-night-1 ring-1 ring-white/10 text-sm focus:outline-none focus:ring-brand-glow/50"
        />
        <button onClick={() => applyBulk(shownReps)} className="px-3 py-1.5 rounded-lg bg-brand/20 text-brand-glow text-xs font-medium hover:bg-brand/30">
          表示中の全担当×全{type === "日次" ? "日" : "週"}に適用（全日程）
        </button>
        {reps.length === 0 && <span className="text-xs text-accent-amber">担当者が取得できません（Notionの接続/権限を確認）</span>}
      </div>

      {/* グリッド */}
      <div className="overflow-x-auto">
        <table className="text-sm border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-surface text-left text-xs text-ink-muted font-medium px-2 py-2 min-w-28">担当</th>
              <th className="bg-surface text-xs text-ink-muted font-medium px-2 py-2">一括</th>
              {cols.map((c) => (
                <th key={c.key} className="text-xs text-ink-muted font-medium px-1 py-2 text-center whitespace-nowrap">
                  {c.label}
                </th>
              ))}
              <th className="text-xs text-ink-muted font-medium px-2 py-2 text-right">計</th>
            </tr>
          </thead>
          <tbody>
            {shownReps.map((rep) => (
              <tr key={rep}>
                <td className="sticky left-0 z-10 bg-night-1 text-ink font-medium px-2 py-1 whitespace-nowrap">{rep}</td>
                <td className="px-1 py-1 text-center">
                  <button
                    onClick={() => applyBulk([rep])}
                    className="px-2 py-1 rounded bg-white/10 text-ink-muted text-[11px] hover:bg-white/20"
                    title="一括入力の値をこの担当の全期間へ"
                  >
                    適用
                  </button>
                </td>
                {cols.map((c) => (
                  <td key={c.key} className="px-0.5 py-1">
                    <input
                      value={data[rep]?.[c.key] ?? ""}
                      onChange={(e) => setCell(rep, c.key, e.target.value)}
                      inputMode="numeric"
                      className="w-12 px-1 py-1 rounded bg-night-0 ring-1 ring-white/10 text-xs text-center focus:outline-none focus:ring-brand-glow/50"
                    />
                  </td>
                ))}
                <td className="px-2 py-1 text-right tabular-nums text-ink-soft">{rowTotal(rep)}</td>
              </tr>
            ))}
            {shownReps.length === 0 && (
              <tr>
                <td colSpan={cols.length + 3} className="text-center text-ink-muted py-6 text-sm">
                  担当者がいません。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={state === "saving"}
          className="px-4 py-2 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand-soft transition-colors disabled:opacity-50"
        >
          {state === "saving" ? "保存中…" : `${type}目標を保存（${month}）`}
        </button>
        {state === "saved" && <span className="text-sm text-brand-glow">✓ 保存しました</span>}
        {state === "error" && <span className="text-sm text-accent-red">⚠ {err}</span>}
        <span className="text-xs text-ink-muted">※ 月ごとに保存します。別の月は対象月を変えて保存してください。</span>
      </div>
    </section>
  );
}
