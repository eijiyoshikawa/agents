"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { StoredTargets } from "@/lib/notion";

type RepRow = { rep: string; daily: string };

export default function TargetsForm({ initial }: { initial: StoredTargets | null }) {
  const [workingDays, setWorkingDays] = useState(String(initial?.workingDaysPerMonth ?? 20));
  const [appts, setAppts] = useState(String(initial?.monthlyAppointments ?? 0));
  const [contracts, setContracts] = useState(String(initial?.monthlyContracts ?? 0));
  const [dailyDefault, setDailyDefault] = useState(String(initial?.dailyCallsDefault ?? 0));
  const [rows, setRows] = useState<RepRow[]>(
    Object.entries(initial?.dailyCallsByRep ?? {}).map(([rep, daily]) => ({ rep, daily: String(daily) })),
  );
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [err, setErr] = useState("");

  const setRow = (i: number, patch: Partial<RepRow>) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const addRow = () => setRows((rs) => [...rs, { rep: "", daily: "" }]);
  const delRow = (i: number) => setRows((rs) => rs.filter((_, j) => j !== i));

  const save = async () => {
    setState("saving");
    setErr("");
    const dailyCallsByRep: Record<string, number> = {};
    for (const r of rows) {
      const n = Number(r.daily);
      if (r.rep.trim() && n > 0) dailyCallsByRep[r.rep.trim()] = n;
    }
    try {
      const res = await fetch("/api/targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workingDaysPerMonth: Number(workingDays),
          monthlyAppointments: Number(appts),
          monthlyContracts: Number(contracts),
          dailyCallsDefault: Number(dailyDefault),
          dailyCallsByRep,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "保存失敗");
      setState("saved");
    } catch (e: any) {
      setState("error");
      setErr(e?.message ?? "保存失敗");
    }
  };

  return (
    <div className="space-y-6">
      <section className="card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-ink">全社・月次の目標</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <NumField label="月次 アポ獲得目標（件）" value={appts} onChange={setAppts} />
          <NumField label="月次 契約数目標（件）" value={contracts} onChange={setContracts} />
        </div>
      </section>

      <section className="card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-ink">架電目標</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <NumField label="日次 架電目標（全担当の既定・件/日）" value={dailyDefault} onChange={setDailyDefault} />
          <NumField label="営業日数（月次換算用・日/月）" value={workingDays} onChange={setWorkingDays} />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-ink-muted">担当者ごとの日次架電目標（既定を上書き）</span>
            <button onClick={addRow} className="inline-flex items-center gap-1 text-xs text-brand-glow hover:underline">
              <Plus size={13} /> 担当を追加
            </button>
          </div>
          <div className="space-y-2">
            {rows.length === 0 && <p className="text-xs text-ink-muted">未設定（全員に既定値を適用）</p>}
            {rows.map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={r.rep}
                  onChange={(e) => setRow(i, { rep: e.target.value })}
                  placeholder="担当名（例: 吉田）"
                  className="flex-1 px-3 py-2 rounded-lg bg-night-1 ring-1 ring-white/10 text-sm focus:outline-none focus:ring-brand-glow/50"
                />
                <input
                  value={r.daily}
                  onChange={(e) => setRow(i, { daily: e.target.value })}
                  inputMode="numeric"
                  placeholder="件/日"
                  className="w-24 px-3 py-2 rounded-lg bg-night-1 ring-1 ring-white/10 text-sm focus:outline-none focus:ring-brand-glow/50"
                />
                <button onClick={() => delRow(i)} className="p-2 rounded-lg text-ink-muted hover:bg-white/10" title="削除">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={state === "saving"}
          className="px-4 py-2 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand-soft transition-colors disabled:opacity-50"
        >
          {state === "saving" ? "保存中…" : "目標を保存"}
        </button>
        {state === "saved" && <span className="text-sm text-brand-glow">✓ 保存しました（ダッシュボードに反映されます）</span>}
        {state === "error" && <span className="text-sm text-accent-red">⚠ {err}</span>}
      </div>
    </div>
  );
}

function NumField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs text-ink-muted">{label}</span>
      <input
        value={value}
        inputMode="numeric"
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full px-3 py-2 rounded-lg bg-night-1 ring-1 ring-white/10 text-sm focus:outline-none focus:ring-brand-glow/50"
      />
    </label>
  );
}
