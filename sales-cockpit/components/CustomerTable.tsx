"use client";

import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";
import { Search, ChevronDown, ArrowLeft, ArrowRight, X, Bookmark, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import type { Customer, SearchResult, SearchRow } from "@/lib/types";
import CallButton from "./CallButton";
import { CustomerDetailBody, RANK_COLOR, GoogleSearchButton } from "./CustomerDetailParts";

export type InitialFilters = { q?: string; rep?: string; status?: string; rank?: string; industry?: string };

const COLSPAN = 8;
const PAGE_SIZE = 50;

export default function CustomerTable({
  initial,
  options = {},
  initialData,
}: {
  initial?: InitialFilters;
  options?: Record<string, string[]>;
  initialData: SearchResult;
}) {
  const [q, setQ] = useState(initial?.q ?? "");
  const [rep, setRep] = useState(initial?.rep ?? "");
  const [status, setStatus] = useState(initial?.status ?? "");
  const [rank, setRank] = useState(initial?.rank ?? "");
  const [industry, setIndustry] = useState(initial?.industry ?? "");
  const [dupOnly, setDupOnly] = useState(false);
  const [agencyMode, setAgencyMode] = useState<"all" | "exclude" | "only">("all");
  const [sortKey, setSortKey] = useState<string>("lastCallDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  const [data, setData] = useState<SearchResult>(initialData);
  const [loading, setLoading] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const first = useRef(true);
  // 検索条件＋ページごとの結果キャッシュ（SWR方式）。
  // 一度見たページは即表示し、裏で最新を取得して置き換える。次ページは先読みする。
  const cache = useRef(new Map<string, SearchResult>());

  // フィルタ変更時は1ページ目へ
  const resetTo1 = () => setPage(1);
  const onQ = (v: string) => { setQ(v); resetTo1(); };
  const onRep = (v: string) => { setRep(v); resetTo1(); };
  const onStatus = (v: string) => { setStatus(v); resetTo1(); };
  const onRank = (v: string) => { setRank(v); resetTo1(); };
  const onIndustry = (v: string) => { setIndustry(v); resetTo1(); };
  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
    resetTo1();
  };

  const buildQs = (pageN: number) =>
    new URLSearchParams({
      q, rep, status, rank, industry, agencyMode,
      dupOnly: dupOnly ? "1" : "",
      sort: sortKey, dir: sortDir, page: String(pageN), pageSize: String(PAGE_SIZE),
    }).toString();

  useEffect(() => {
    const qs = buildQs(page);
    // 初回はサーバー描画済みの initialData をキャッシュに載せてフェッチをスキップ
    if (first.current) {
      first.current = false;
      cache.current.set(qs, initialData);
      return;
    }
    const cached = cache.current.get(qs);
    if (cached) {
      // キャッシュ即表示（stale-while-revalidate: 裏で最新を取得して置き換える）
      setData(cached);
      setOpenId(null);
    } else {
      setLoading(true);
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/customers?${qs}`, { signal: ctrl.signal });
        const j = await res.json();
        if (j.ok) {
          cache.current.set(qs, j);
          // キャッシュは直近60件まで（古い順に間引く）
          if (cache.current.size > 60) {
            const oldest = cache.current.keys().next().value;
            if (oldest !== undefined) cache.current.delete(oldest);
          }
          setData(j);
          if (!cached) setOpenId(null);
          // 次ページを裏で先読みし、ページ送りを即時にする
          const totalPages = Math.max(1, Math.ceil(j.total / j.pageSize));
          if (page < totalPages) {
            const nqs = buildQs(page + 1);
            if (!cache.current.has(nqs)) {
              fetch(`/api/customers?${nqs}`)
                .then((r) => r.json())
                .then((nj) => { if (nj.ok) cache.current.set(nqs, nj); })
                .catch(() => {});
            }
          }
        }
      } catch {
        /* aborted */
      } finally {
        setLoading(false);
      }
    }, cached ? 150 : 300);
    return () => { ctrl.abort(); clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, rep, status, rank, industry, dupOnly, agencyMode, sortKey, sortDir, page]);

  const rows = data.rows;
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const startN = data.total === 0 ? 0 : (data.page - 1) * data.pageSize + 1;
  const endN = Math.min(data.page * data.pageSize, data.total);

  const openIndex = rows.findIndex((c) => c.id === openId);
  const openAt = (i: number) => { if (i >= 0 && i < rows.length) setOpenId(rows[i].id); };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => onQ(e.target.value)}
            placeholder="顧客名・電話番号で検索"
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-surface ring-1 ring-white/10 text-sm focus:outline-none focus:ring-brand-glow/50"
          />
        </div>
        <Select value={rep} onChange={onRep} options={options["IS担当"] ?? []} placeholder="IS担当（全員）" includeNone />
        <Select value={status} onChange={onStatus} options={options["ステータス"] ?? []} placeholder="ステータス（全て）" includeNone />
        <Select value={rank} onChange={onRank} options={options["見込み度合い"] ?? []} placeholder="見込み度合い（全て）" />
        <Select value={industry} onChange={onIndustry} options={options["業種"] ?? []} placeholder="業種（全て）" />
        <button
          onClick={() => { setDupOnly((v) => !v); resetTo1(); }}
          className={clsx(
            "px-3 py-2 rounded-lg text-sm font-medium ring-1 transition-colors",
            dupOnly ? "bg-accent-amber/20 text-accent-amber ring-accent-amber/30" : "bg-surface text-ink-muted ring-white/10 hover:text-ink",
          )}
        >
          重複候補のみ
        </button>
        <select
          value={agencyMode}
          onChange={(e) => { setAgencyMode(e.target.value as any); resetTo1(); }}
          className="px-3 py-2 rounded-lg bg-surface ring-1 ring-white/10 text-sm focus:outline-none focus:ring-brand-glow/50"
        >
          <option value="all">人材紹介: 含む</option>
          <option value="exclude">人材紹介: 除外</option>
          <option value="only">人材紹介: のみ</option>
        </select>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-400 inline-flex items-center gap-2">
          {loading && <Loader2 size={13} className="animate-spin" />}
          {data.total.toLocaleString()} 件
          <span className="text-accent-amber">・重複候補 {data.totalDup.toLocaleString()}</span>
          <span className="text-accent-violet">・人材紹介の疑い {data.totalAgency.toLocaleString()}</span>
        </p>
        <SaveListBar filters={{ q, rep, status, rank, industry }} count={data.total} />
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-slate-400 border-b border-white/10">
              <SortHead label="顧客名" col="name" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} className="text-left px-4 py-2.5" />
              <SortHead label="ステータス" col="status" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} className="text-left px-3 py-2.5" />
              <SortHead label="見込" col="rank" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} className="text-center px-3 py-2.5" />
              <SortHead label="業種" col="industry" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} className="text-left px-3 py-2.5" />
              <SortHead label="IS担当" col="isRep" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} className="text-left px-3 py-2.5" />
              <SortHead label="架電回数" col="callCount" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} className="text-right px-3 py-2.5" />
              <SortHead label="最終架電" col="lastCallDate" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} className="text-left px-3 py-2.5" />
              <th className="text-right font-medium px-4 py-2.5">発信</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={COLSPAN} className="text-center text-ink-muted py-8 text-sm">
                  {loading ? "読み込み中…" : "該当する顧客がありません。"}
                </td>
              </tr>
            )}
            {rows.map((c) => (
              <Fragment key={c.id}>
                <tr
                  onClick={() => setOpenId(openId === c.id ? null : c.id)}
                  className={clsx(
                    "border-b border-white/[0.06] cursor-pointer transition-colors",
                    openId === c.id ? "bg-brand/10" : "hover:bg-white/[0.04]",
                  )}
                >
                  <td className="px-4 py-2.5 font-medium max-w-64">
                    <span className="inline-flex items-center gap-1.5">
                      <ChevronDown size={14} className={clsx("text-slate-400 transition-transform shrink-0", openId === c.id && "rotate-180")} />
                      <span className="truncate">{c.name}</span>
                      {c.dup && <span className="chip bg-accent-amber/20 text-accent-amber shrink-0">重複?</span>}
                      {c.agency && <span className="chip bg-accent-violet/20 text-accent-violet shrink-0">人材紹介?</span>}
                    </span>
                    {c.phone && <div className="text-xs text-slate-400 font-mono ml-5">{c.phone}</div>}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-slate-300">{c.status ?? "—"}</td>
                  <td className="px-3 py-2.5 text-center">
                    {c.rank && <span className={clsx("chip", RANK_COLOR[c.rank] ?? "bg-white/10 text-slate-300")}>{c.rank}</span>}
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
                        index={openIndex}
                        total={rows.length}
                        partners={[]}
                        agency={c.agency}
                        options={options}
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

      {/* ページング */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-slate-400">{startN.toLocaleString()}–{endN.toLocaleString()} / {data.total.toLocaleString()} 件</p>
        <div className="flex items-center gap-1.5">
          <PageBtn onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={data.page <= 1} icon={<ChevronLeft size={15} />} label="前" />
          <span className="text-xs text-ink-muted px-1 tabular-nums">{data.page} / {totalPages}</span>
          <PageBtn onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={data.page >= totalPages} icon={<ChevronRight size={15} />} label="次" right />
        </div>
      </div>
    </div>
  );
}

function DetailPanel({
  c, index, total, partners, agency, options, onPrev, onNext, onClose,
}: {
  c: SearchRow;
  index: number;
  total: number;
  partners: string[];
  agency: string | null;
  options: Record<string, string[]>;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [full, setFull] = useState<Customer | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [c.id]);

  useEffect(() => {
    let alive = true;
    setFull(null);
    setErr("");
    fetch(`/api/customer?id=${encodeURIComponent(c.id)}`)
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        if (j.ok) setFull(j.customer as Customer);
        else setErr(j.error || "読み込みに失敗しました");
      })
      .catch((e) => alive && setErr(e?.message ?? "読み込みに失敗しました"));
    return () => { alive = false; };
  }, [c.id]);

  return (
    <div ref={ref} className="p-5 border-b border-white/10 animate-growFromBottom">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-base">{c.name}</h3>
          {c.rank && <span className={clsx("chip", RANK_COLOR[c.rank] ?? "bg-white/10 text-slate-300")}>{c.rank}</span>}
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

      {err ? (
        <p className="py-8 text-center text-sm text-accent-red">⚠ {err}</p>
      ) : !full ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-400">
          <Loader2 size={16} className="animate-spin" /> 詳細を読み込み中…
        </div>
      ) : (
        <CustomerDetailBody c={full} partners={partners} agency={agency} options={options} onNext={onNext} />
      )}
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
      <button onClick={save} disabled={state === "saving"} className="px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-medium hover:bg-brand-soft transition-colors disabled:opacity-50">
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

function SortHead({
  label, col, sortKey, sortDir, onClick, className,
}: {
  label: string;
  col: string;
  sortKey: string;
  sortDir: "asc" | "desc";
  onClick: (k: string) => void;
  className?: string;
}) {
  return (
    <th onClick={() => onClick(col)} className={clsx("font-medium whitespace-nowrap cursor-pointer hover:text-ink select-none", className)}>
      {label}
      {sortKey === col ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
    </th>
  );
}

function NavBtn({ onClick, disabled, icon, label, right }: { onClick: () => void; disabled: boolean; icon: ReactNode; label: string; right?: boolean }) {
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

function PageBtn({ onClick, disabled, icon, label, right }: { onClick: () => void; disabled: boolean; icon: ReactNode; label: string; right?: boolean }) {
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

function Select({
  value, onChange, options, placeholder, includeNone,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
  includeNone?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-2 rounded-lg bg-surface ring-1 ring-white/10 text-sm focus:outline-none focus:ring-brand-glow/50"
    >
      <option value="">{placeholder}</option>
      {includeNone && <option value="__none__">該当なし（未設定）</option>}
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}
