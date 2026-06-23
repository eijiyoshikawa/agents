"use client";

import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";
import { Search, ChevronDown, ExternalLink, ArrowLeft, ArrowRight, X, Bookmark } from "lucide-react";
import type { Customer } from "@/lib/types";
import { buildHooks } from "@/lib/hooks";
import CallButton from "./CallButton";

export type InitialFilters = { q?: string; rep?: string; status?: string; rank?: string; industry?: string };

const RANK_COLOR: Record<string, string> = {
  A: "bg-accent-red/15 text-accent-red",
  B: "bg-accent-indigo/15 text-accent-indigo",
  C: "bg-accent-amber/20 text-accent-amber",
  D: "bg-white/10 text-slate-300",
};

const COLSPAN = 8;

function googleSearchUrl(c: Customer): string {
  const q = [c.name, c.address].filter(Boolean).join(" ");
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}

export default function CustomerTable({
  customers,
  initial,
}: {
  customers: Customer[];
  initial?: InitialFilters;
}) {
  const [q, setQ] = useState(initial?.q ?? "");
  const [rep, setRep] = useState(initial?.rep ?? "");
  const [status, setStatus] = useState(initial?.status ?? "");
  const [rank, setRank] = useState(initial?.rank ?? "");
  const [industry, setIndustry] = useState(initial?.industry ?? "");
  const [openId, setOpenId] = useState<string | null>(null);

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
        needle ? c.name.toLowerCase().includes(needle) || (c.phone ?? "").includes(needle) : true,
      )
      .sort((a, b) => (b.lastCallDate ?? "").localeCompare(a.lastCallDate ?? ""));
  }, [customers, q, rep, status, rank, industry]);

  const openIndex = useMemo(() => filtered.findIndex((c) => c.id === openId), [filtered, openId]);
  const openAt = (i: number) => {
    if (i >= 0 && i < filtered.length) setOpenId(filtered[i].id);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="顧客名・電話番号で検索"
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-surface ring-1 ring-white/10 text-sm focus:outline-none focus:ring-brand-glow/50"
          />
        </div>
        <Select value={rep} onChange={setRep} options={reps} placeholder="IS担当（全員）" />
        <Select value={status} onChange={setStatus} options={statuses} placeholder="ステータス（全て）" />
        <Select value={rank} onChange={setRank} options={ranks} placeholder="見込み度合い（全て）" />
        <Select value={industry} onChange={setIndustry} options={industries} placeholder="業種（全て）" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-400">{filtered.length.toLocaleString()} 件 ・ 行をクリックで詳細・メモ</p>
        <SaveListBar filters={{ q, rep, status, rank, industry }} count={filtered.length} />
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-slate-400 border-b border-white/10">
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
            {filtered.map((c, i) => (
              <Fragment key={c.id}>
                <tr
                  onClick={() => setOpenId(openId === c.id ? null : c.id)}
                  className={clsx(
                    "border-b border-white/[0.06] cursor-pointer transition-colors",
                    openId === c.id ? "bg-brand/10" : "hover:bg-white/[0.04]",
                  )}
                >
                  <td className="px-4 py-2.5 font-medium max-w-56 truncate">
                    <span className="inline-flex items-center gap-1.5">
                      <ChevronDown
                        size={14}
                        className={clsx("text-slate-400 transition-transform", openId === c.id && "rotate-180")}
                      />
                      {c.name}
                    </span>
                    {c.phone && <div className="text-xs text-slate-400 font-mono ml-5">{c.phone}</div>}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-slate-300">{c.status ?? "—"}</td>
                  <td className="px-3 py-2.5 text-center">
                    {c.rank && (
                      <span className={clsx("chip", RANK_COLOR[c.rank] ?? "bg-white/10 text-slate-300")}>{c.rank}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-slate-300">{c.industry ?? "—"}</td>
                  <td className="px-3 py-2.5 text-xs text-slate-300">{c.isRep ?? "—"}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{c.callCount ?? 0}</td>
                  <td className="px-3 py-2.5 text-xs text-slate-400">{c.lastCallDate?.slice(0, 10) ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                    {c.phone ? <CallButton phone={c.phone} /> : <GoogleSearchButton c={c} />}
                  </td>
                </tr>
                {openId === c.id && (
                  <tr className="bg-night-2/60">
                    <td colSpan={COLSPAN} className="px-0 py-0">
                      <DetailPanel
                        c={c}
                        index={i}
                        total={filtered.length}
                        onPrev={() => openAt(openIndex - 1)}
                        onNext={() => openAt(openIndex + 1)}
                        onClose={() => setOpenId(null)}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DetailPanel({
  c,
  index,
  total,
  onPrev,
  onNext,
  onClose,
}: {
  c: Customer;
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [c.id]);

  return (
    <div ref={ref} className="p-5 border-b border-white/10 animate-growFromBottom">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-base">{c.name}</h3>
          {c.rank && (
            <span className={clsx("chip", RANK_COLOR[c.rank] ?? "bg-white/10 text-slate-300")}>{c.rank}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-400 mr-1">{index + 1} / {total}</span>
          <NavBtn onClick={onPrev} disabled={index <= 0} icon={<ArrowLeft size={14} />} label="前へ" />
          <NavBtn onClick={onNext} disabled={index >= total - 1} icon={<ArrowRight size={14} />} label="次へ" right />
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-white/10" title="閉じる">
            <X size={15} />
          </button>
        </div>
      </div>

      <HookBox c={c} />

      <div className="grid md:grid-cols-3 gap-x-6 gap-y-2 text-sm">
        <Field label="電話番号" value={c.phone} mono />
        <Field label="ステータス" value={c.status} />
        <Field label="IS担当" value={c.isRep} />
        <Field label="代表者名" value={c.rep3} />
        <Field label="業種 / フェーズ" value={[c.industry, c.phase].filter(Boolean).join(" / ") || null} />
        <Field label="S担当 / CS担当" value={[c.sRep, c.csRep].filter(Boolean).join(" / ") || null} />
        <Field label="住所" value={c.address} />
        <Field label="メール" value={c.email} mono />
        <Field label="営業手法" value={c.method} />
        <Field label="架電回数 / 最終架電" value={`${c.callCount ?? 0} 回 / ${c.lastCallDate?.slice(0, 10) ?? "—"}`} />
        <Field label="アポ取得日" value={c.appointmentDate?.slice(0, 10) ?? null} />
        <Field label="会社URL" value={c.companyUrl} link />
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-4">
        {c.phone ? <CallButton phone={c.phone} /> : <GoogleSearchButton c={c} prominent />}
        <a
          href={googleSearchUrl(c)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 text-slate-200 text-xs font-medium hover:bg-white/20 transition-colors"
        >
          <Search size={13} /> Google検索
        </a>
        <a
          href={c.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 text-slate-200 text-xs font-medium hover:bg-white/20 transition-colors"
        >
          <ExternalLink size={13} /> Notionで開く
        </a>
      </div>

      <MemoEditor customerId={c.id} initial={c.memo ?? ""} />
    </div>
  );
}

function MemoEditor({ customerId, initial }: { customerId: string; initial: string }) {
  const [memo, setMemo] = useState(initial);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [err, setErr] = useState("");

  // 別の企業に切り替わったら内容を同期
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
        <button
          onClick={save}
          disabled={state === "saving"}
          className="px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-medium hover:bg-brand-soft transition-colors disabled:opacity-50"
        >
          メモを保存
        </button>
      </div>
    </div>
  );
}

function SaveListBar({ filters, count }: { filters: InitialFilters; count: number }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [err, setErr] = useState("");

  const save = async () => {
    if (!name.trim()) return;
    setState("saving");
    setErr("");
    try {
      const res = await fetch("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), filters, count }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "保存失敗");
      setState("saved");
      setName("");
      setTimeout(() => setOpen(false), 900);
    } catch (e: any) {
      setState("error");
      setErr(e?.message ?? "保存失敗");
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 text-slate-200 text-xs font-medium hover:bg-white/20 transition-colors"
      >
        <Bookmark size={13} /> 現在の条件をリスト保存
      </button>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <input
        value={name}
        autoFocus
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && save()}
        placeholder="リスト名（例: 建設・A・未架電）"
        className="px-3 py-1.5 rounded-lg bg-night-1 ring-1 ring-white/10 text-sm focus:outline-none focus:ring-brand-glow/50"
      />
      <button
        onClick={save}
        disabled={state === "saving"}
        className="px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-medium hover:bg-brand-soft transition-colors disabled:opacity-50"
      >
        {state === "saving" ? "保存中…" : "保存"}
      </button>
      <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-white/10">
        <X size={14} />
      </button>
      {state === "saved" && <span className="text-xs text-brand-glow">✓ 保存</span>}
      {state === "error" && <span className="text-xs text-accent-red">⚠ {err}</span>}
    </div>
  );
}

function HookBox({ c }: { c: Customer }) {
  const hooks = buildHooks(c);
  const dot: Record<string, string> = {
    good: "bg-brand-glow",
    chance: "bg-accent-amber",
    info: "bg-ink-muted",
  };
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

function GoogleSearchButton({ c, prominent }: { c: Customer; prominent?: boolean }) {
  return (
    <a
      href={googleSearchUrl(c)}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-lg font-medium transition-colors",
        prominent
          ? "px-2.5 py-1 bg-accent-amber/20 text-accent-amber hover:bg-accent-amber/30 text-xs"
          : "px-2.5 py-1 bg-white/10 text-slate-300 hover:bg-white/20 text-xs",
      )}
      title={`${c.name} を Google 検索`}
    >
      <Search size={13} /> 検索
    </a>
  );
}

function NavBtn({
  onClick,
  disabled,
  icon,
  label,
  right,
}: {
  onClick: () => void;
  disabled: boolean;
  icon: ReactNode;
  label: string;
  right?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/10 text-slate-200 text-xs font-medium hover:bg-white/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {!right && icon}
      {label}
      {right && icon}
    </button>
  );
}

function Field({ label, value, mono, link }: { label: string; value: string | null; mono?: boolean; link?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] text-slate-500">{label}</div>
      {link && value ? (
        <a href={value} target="_blank" rel="noreferrer" className="text-brand-glow hover:underline truncate block">
          {value}
        </a>
      ) : (
        <div className={clsx("text-slate-200 truncate", mono && "font-mono")}>{value || "—"}</div>
      )}
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
      className="px-3 py-2 rounded-lg bg-surface ring-1 ring-white/10 text-sm focus:outline-none focus:ring-brand-glow/50"
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
