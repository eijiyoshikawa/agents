"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { Search, ExternalLink } from "lucide-react";
import type { Customer } from "@/lib/types";
import { buildHooks } from "@/lib/hooks";
import { agencyReason } from "@/lib/leadflags";
import CallButton from "./CallButton";
import CustomerEditForm from "./CustomerEditForm";

export const RANK_COLOR: Record<string, string> = {
  A: "bg-accent-red/15 text-accent-red",
  B: "bg-accent-indigo/15 text-accent-indigo",
  C: "bg-accent-amber/20 text-accent-amber",
  D: "bg-white/10 text-slate-300",
};

export function googleSearchUrl(c: { name: string; address: string | null }): string {
  const q = [c.name, c.address].filter(Boolean).join(" ");
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}

const RECORD_STATUSES = [
  "アポイント獲得", "見込み客", "資料請求", "再コール", "担当者不在", "担当者拒否", "受付拒否", "不通", "クレーム",
  "提案中", "商談中", "契約中", "契約終了", "失注", "パートナー",
];

/** 詳細本体（フラグ→架電フック→項目→アクション→記録→メモ）。一覧の展開と単体ページで共用。 */
export function CustomerDetailBody({
  c,
  partners = [],
  agency,
  options = {},
  onNext,
}: {
  c: Customer;
  partners?: string[];
  agency?: string | null;
  options?: Record<string, string[]>;
  onNext?: () => void;
}) {
  const agencyFlag = agency === undefined ? agencyReason(c) : agency;
  return (
    <div>
      {(agencyFlag || partners.length > 0) && (
        <div className="mb-4 space-y-2">
          {agencyFlag && (
            <div className="rounded-xl bg-accent-violet/10 ring-1 ring-accent-violet/30 p-3 text-sm">
              <span className="font-semibold text-accent-violet">⚑ 人材紹介会社の疑い</span>
              <span className="text-ink-soft">（{agencyFlag}）— 自社サービスの競合/対象外の可能性。架電要否を確認。</span>
            </div>
          )}
          {partners.length > 0 && (
            <div className="rounded-xl bg-accent-amber/10 ring-1 ring-accent-amber/30 p-3 text-sm">
              <div className="font-semibold text-accent-amber mb-1">⚑ 重複の可能性（{partners.length}件）</div>
              <ul className="space-y-0.5 text-ink-soft">
                {partners.slice(0, 6).map((p, i) => (
                  <li key={i}>・{p}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <HookBox c={c} />

      <CustomerEditForm c={c} options={options} />
      <div className="mt-1 text-[11px] text-ink-muted">
        架電回数 {c.callCount ?? 0} 回 ・ 最終架電 {c.lastCallDate?.slice(0, 10) ?? "—"}
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-4">
        {c.phone ? <CallButton phone={c.phone} /> : <GoogleSearchButton c={c} prominent />}
        <a href={googleSearchUrl(c)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 text-slate-200 text-xs font-medium hover:bg-white/20 transition-colors">
          <Search size={13} /> Google検索
        </a>
        <a href={c.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 text-slate-200 text-xs font-medium hover:bg-white/20 transition-colors">
          <ExternalLink size={13} /> Notionで開く
        </a>
      </div>

      <CallRecorder c={c} onNext={onNext} />
      <MemoEditor customerId={c.id} initial={c.memo ?? ""} />
    </div>
  );
}

export function HookBox({ c }: { c: Customer }) {
  const hooks = buildHooks(c);
  const dot: Record<string, string> = { good: "bg-brand-glow", chance: "bg-accent-amber", info: "bg-ink-muted" };
  return (
    <div className="mb-4 rounded-xl bg-brand/10 ring-1 ring-brand/20 p-3.5">
      <div className="text-xs font-semibold text-brand-glow mb-1.5">📌 架電フック（採用×SNS）</div>
      <ul className="space-y-1">
        {hooks.map((h, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-ink">
            <span className={clsx("mt-1.5 h-1.5 w-1.5 rounded-full shrink-0", dot[h.tone])} />
            <span>{h.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function GoogleSearchButton({ c, prominent }: { c: { name: string; address: string | null }; prominent?: boolean }) {
  return (
    <a
      href={googleSearchUrl(c)}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-lg font-medium transition-colors px-2.5 py-1 text-xs",
        prominent ? "bg-accent-amber/20 text-accent-amber hover:bg-accent-amber/30" : "bg-white/10 text-slate-300 hover:bg-white/20",
      )}
      title={`${c.name} を Google 検索`}
    >
      <Search size={13} /> 検索
    </a>
  );
}

function MemoEditor({ customerId, initial }: { customerId: string; initial: string }) {
  const [memo, setMemo] = useState(initial);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [err, setErr] = useState("");

  useEffect(() => {
    setMemo(initial);
    setState("idle");
  }, [customerId, initial]);

  const save = async () => {
    setState("saving");
    setErr("");
    try {
      const res = await fetch("/api/memo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: customerId, memo }),
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
    <div className="mt-4">
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-medium text-slate-400">メモ（Notionの「メモ」に保存）</label>
        <span className="text-xs">
          {state === "saving" && <span className="text-slate-400">保存中…</span>}
          {state === "saved" && <span className="text-brand-glow">✓ 保存しました</span>}
          {state === "error" && <span className="text-accent-red">⚠ {err}</span>}
        </span>
      </div>
      <textarea
        value={memo}
        onChange={(e) => {
          setMemo(e.target.value);
          if (state !== "idle") setState("idle");
        }}
        rows={3}
        placeholder="架電結果・所感などを記入"
        className="w-full px-3 py-2 rounded-lg bg-night-1 ring-1 ring-white/10 text-sm focus:outline-none focus:ring-brand-glow/50 resize-y"
      />
      <div className="mt-2">
        <button onClick={save} disabled={state === "saving"} className="px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-medium hover:bg-brand-soft transition-colors disabled:opacity-50">
          メモを保存
        </button>
      </div>
    </div>
  );
}

function CallRecorder({ c, onNext }: { c: Customer; onNext?: () => void }) {
  const [result, setResult] = useState("");
  const [memo, setMemo] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [err, setErr] = useState("");

  useEffect(() => {
    setResult("");
    setMemo("");
    setState("idle");
  }, [c.id]);

  const save = async (advance: boolean) => {
    if (!result) {
      setErr("結果を選択してください");
      setState("error");
      return;
    }
    setState("saving");
    setErr("");
    try {
      const res = await fetch("/api/call-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: c.id, customerName: c.name, result, memo }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "記録失敗");
      setState("saved");
      if (advance && onNext) setTimeout(onNext, 300);
    } catch (e: any) {
      setState("error");
      setErr(e?.message ?? "記録失敗");
    }
  };

  return (
    <div className="mt-4 rounded-xl bg-white/[0.04] ring-1 ring-white/10 p-3.5">
      <div className="text-xs font-semibold text-ink mb-2">📞 架電結果を記録（日付つきで記録＋ステータス更新）</div>
      <div className="flex flex-wrap items-center gap-2">
        <select value={result} onChange={(e) => setResult(e.target.value)} className="px-3 py-2 rounded-lg bg-night-1 ring-1 ring-white/10 text-sm focus:outline-none focus:ring-brand-glow/50">
          <option value="">結果を選択</option>
          {RECORD_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="ひとことメモ（任意）" className="flex-1 min-w-40 px-3 py-2 rounded-lg bg-night-1 ring-1 ring-white/10 text-sm focus:outline-none focus:ring-brand-glow/50" />
        <button onClick={() => save(false)} disabled={state === "saving"} className="px-3 py-2 rounded-lg bg-brand text-white text-xs font-medium hover:bg-brand-soft disabled:opacity-50">
          記録
        </button>
        {onNext && (
          <button onClick={() => save(true)} disabled={state === "saving"} className="px-3 py-2 rounded-lg bg-white/10 text-ink text-xs font-medium hover:bg-white/20 disabled:opacity-50">
            記録して次へ
          </button>
        )}
        {state === "saved" && <span className="text-xs text-brand-glow">✓ 記録しました</span>}
        {state === "error" && <span className="text-xs text-accent-red">⚠ {err}</span>}
      </div>
    </div>
  );
}
