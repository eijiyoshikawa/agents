"use client";

import { useMemo, useState } from "react";
import type { Customer } from "@/lib/types";

type FieldType = "select" | "status" | "text" | "phone" | "email" | "url" | "date";
type FieldDef = { name: string; label: string; type: FieldType; get: (c: Customer) => string | null };

// Notionプロパティ名 = name（更新APIと一致）。get で現在値を取得。
const FIELDS: FieldDef[] = [
  { name: "ステータス", label: "ステータス", type: "status", get: (c) => c.status },
  { name: "見込み度合い", label: "見込み度合い", type: "select", get: (c) => c.rank },
  { name: "IS担当", label: "IS担当", type: "select", get: (c) => c.isRep },
  { name: "S担当", label: "S担当", type: "select", get: (c) => c.sRep },
  { name: "CS担当", label: "CS担当", type: "select", get: (c) => c.csRep },
  { name: "業種", label: "業種", type: "select", get: (c) => c.industry },
  { name: "企業フェーズ", label: "企業フェーズ", type: "select", get: (c) => c.phase },
  { name: "営業手法", label: "営業手法", type: "select", get: (c) => c.method },
  { name: "電話番号", label: "電話番号", type: "phone", get: (c) => c.phone },
  { name: "代表者名", label: "代表者名", type: "text", get: (c) => c.rep3 },
  { name: "住所", label: "住所", type: "text", get: (c) => c.address },
  { name: "メールアドレス", label: "メール", type: "email", get: (c) => c.email },
  { name: "会社URL", label: "会社URL", type: "url", get: (c) => c.companyUrl },
  { name: "採用ページ", label: "採用ページ", type: "url", get: (c) => c.recruitPage },
  { name: "アポイント取得日", label: "アポ取得日", type: "date", get: (c) => c.appointmentDate?.slice(0, 10) ?? null },
  { name: "次回フォロー日", label: "次回フォロー日", type: "date", get: (c) => c.nextFollow?.slice(0, 10) ?? null },
];

const cls = "mt-0.5 w-full px-2.5 py-1.5 rounded-lg bg-night-1 ring-1 ring-white/10 text-sm focus:outline-none focus:ring-brand-glow/50";

export default function CustomerEditForm({ c, options }: { c: Customer; options: Record<string, string[]> }) {
  const initial = useMemo(() => {
    const o: Record<string, string> = {};
    for (const f of FIELDS) o[f.name] = f.get(c) ?? "";
    return o;
  }, [c]);
  const [vals, setVals] = useState<Record<string, string>>(initial);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [err, setErr] = useState("");

  const set = (name: string, v: string) => {
    setVals((p) => ({ ...p, [name]: v }));
    if (state !== "idle") setState("idle");
  };

  const save = async () => {
    const changed: Record<string, string> = {};
    for (const f of FIELDS) if (vals[f.name] !== initial[f.name]) changed[f.name] = vals[f.name];
    if (Object.keys(changed).length === 0) {
      setState("saved");
      return;
    }
    setState("saving");
    setErr("");
    try {
      const res = await fetch("/api/customer-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: c.id, fields: changed }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "更新失敗");
      setState("saved");
    } catch (e: any) {
      setState("error");
      setErr(e?.message ?? "更新失敗");
    }
  };

  return (
    <div className="mt-2">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2">
        {FIELDS.map((f) => {
          const opts = options[f.name];
          return (
            <label key={f.name} className="block">
              <span className="text-[11px] text-slate-500">{f.label}</span>
              {f.type === "select" || f.type === "status" ? (
                <select value={vals[f.name]} onChange={(e) => set(f.name, e.target.value)} className={cls}>
                  <option value="">（未設定）</option>
                  {(opts ?? []).map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                  {/* 既存値が選択肢に無い場合も保持 */}
                  {vals[f.name] && !(opts ?? []).includes(vals[f.name]) && (
                    <option value={vals[f.name]}>{vals[f.name]}</option>
                  )}
                </select>
              ) : (
                <input
                  type={f.type === "date" ? "date" : "text"}
                  value={vals[f.name]}
                  onChange={(e) => set(f.name, e.target.value)}
                  className={cls}
                />
              )}
            </label>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={save}
          disabled={state === "saving"}
          className="px-4 py-1.5 rounded-lg bg-brand text-white text-xs font-medium hover:bg-brand-soft transition-colors disabled:opacity-50"
        >
          {state === "saving" ? "保存中…" : "項目を保存"}
        </button>
        {state === "saved" && <span className="text-xs text-brand-glow">✓ Notionに反映しました</span>}
        {state === "error" && <span className="text-xs text-accent-red">⚠ {err}</span>}
      </div>
    </div>
  );
}
