"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Search, Loader2, CheckCircle2, Phone } from "lucide-react";

type Row = {
  id: string;
  name: string;
  address: string | null;
  status: string | null;
  phone: string | null;
  url: string;
};

// 訪問結果としてよく使うステータス（タップ選択）
const VISIT_RESULTS = [
  "アポイント獲得", "見込み客", "再コール", "資料請求", "担当者不在", "受付拒否", "担当者拒否", "不通", "クレーム",
];

/** スマホ最適化の訪問記録ページ: 検索 → タップ → 結果＋メモ → 保存 */
export default function VisitLogPage() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [searching, setSearching] = useState(false);
  const [sel, setSel] = useState<Row | null>(null);
  const [status, setStatus] = useState<string>("");
  const [memo, setMemo] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const term = q.trim();
    if (term.length < 2) { setRows([]); return; }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/customers?q=${encodeURIComponent(term)}&pageSize=15`, { signal: ctrl.signal });
        const j = await res.json();
        if (j.ok) setRows(j.rows);
      } catch { /* aborted */ } finally { setSearching(false); }
    }, 350);
    return () => { ctrl.abort(); clearTimeout(t); };
  }, [q]);

  const pick = (r: Row) => { setSel(r); setStatus(""); setMemo(""); setSaved(null); setError(null); };

  const save = async () => {
    if (!sel || (!status && !memo.trim())) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/visit-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: sel.id, status: status || undefined, memo: memo.trim() || undefined }),
      });
      const j = await res.json();
      if (j.ok) {
        setSaved(`${sel.name} に記録しました${status ? `（${status}）` : ""}`);
        setSel(null); setStatus(""); setMemo("");
      } else {
        setError(j.error ?? "保存に失敗しました");
      }
    } catch {
      setError("通信エラー。電波の良い場所で再度お試しください");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-4 pb-24">
      <div>
        <h1 className="text-xl font-bold text-ink">訪問記録</h1>
        <p className="text-xs text-ink-muted mt-0.5">訪問した企業を検索して、その場で結果を記録。Notionに即反映されます。</p>
      </div>

      {saved && (
        <div className="card p-3 ring-accent-teal/40 bg-accent-teal/10 text-sm text-accent-teal flex items-center gap-2">
          <CheckCircle2 size={18} /> {saved}
        </div>
      )}

      {/* 検索 */}
      <div className="relative">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setSaved(null); }}
          placeholder="会社名で検索（2文字以上）"
          className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-surface ring-1 ring-white/10 text-base focus:outline-none focus:ring-brand-glow/50"
        />
        {searching && <Loader2 size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />}
      </div>

      {/* 検索結果 */}
      {!sel && rows.length > 0 && (
        <div className="card divide-y divide-white/5 overflow-hidden">
          {rows.map((r) => (
            <button key={r.id} onClick={() => pick(r)} className="w-full text-left px-4 py-3.5 hover:bg-white/[0.04] active:bg-white/[0.08]">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-ink text-[15px]">{r.name}</span>
                <span className="text-[11px] text-ink-muted whitespace-nowrap px-2 py-0.5 rounded-full bg-surface ring-1 ring-white/10">{r.status ?? "未接触"}</span>
              </div>
              {r.address && <p className="text-xs text-ink-muted mt-0.5 truncate">{r.address}</p>}
            </button>
          ))}
        </div>
      )}
      {!sel && q.trim().length >= 2 && !searching && rows.length === 0 && (
        <p className="text-sm text-ink-muted text-center py-4">該当なし。表記を変えて検索してください</p>
      )}

      {/* 記録フォーム */}
      {sel && (
        <div className="card p-4 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-bold text-ink text-base">{sel.name}</p>
              {sel.address && <p className="text-xs text-ink-muted mt-0.5">{sel.address}</p>}
              <p className="text-xs text-ink-muted mt-0.5">現在: {sel.status ?? "未接触"}</p>
            </div>
            <button onClick={() => setSel(null)} className="text-xs text-ink-muted px-2 py-1 rounded-lg ring-1 ring-white/10 shrink-0">選び直す</button>
          </div>

          {sel.phone && (
            <a href={`tel:${sel.phone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-1.5 text-sm text-brand-glow">
              <Phone size={15} /> {sel.phone}
            </a>
          )}

          <div>
            <p className="text-xs font-semibold text-ink-muted mb-1.5">訪問結果（ステータス更新・任意）</p>
            <div className="grid grid-cols-3 gap-2">
              {VISIT_RESULTS.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(status === s ? "" : s)}
                  className={clsx(
                    "py-3 rounded-xl text-[13px] font-medium ring-1 transition-colors",
                    status === s ? "bg-brand text-white ring-brand" : "bg-surface text-ink-soft ring-white/10 active:bg-white/[0.08]",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-ink-muted mb-1.5">メモ（任意・「【訪問 月/日】」付きで追記されます）</p>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={4}
              placeholder="例: 社長不在。受付の田中さんに資料手渡し。来週再訪OK"
              className="w-full px-3.5 py-3 rounded-xl bg-surface ring-1 ring-white/10 text-base focus:outline-none focus:ring-brand-glow/50"
            />
          </div>

          {error && <p className="text-sm text-accent-red">{error}</p>}

          <button
            onClick={save}
            disabled={saving || (!status && !memo.trim())}
            className={clsx(
              "w-full py-4 rounded-xl text-base font-bold transition-colors",
              saving || (!status && !memo.trim())
                ? "bg-surface text-ink-muted ring-1 ring-white/10"
                : "bg-brand text-white hover:bg-brand-soft",
            )}
          >
            {saving ? "保存中…" : "記録を保存"}
          </button>
        </div>
      )}

      {!sel && rows.length === 0 && q.trim().length < 2 && (
        <div className="card p-4 text-xs text-ink-muted space-y-1.5">
          <p className="font-semibold text-ink-soft">使い方</p>
          <p>1. My Mapsのピンで会社名を確認 → ここで検索</p>
          <p>2. 会社をタップ → 訪問結果とメモを入力 → 保存</p>
          <p>3. 記録は即Notionに反映。次回の訪問リスト書き出しから自動で反映されます</p>
          <p className="pt-1">💡 このページをスマホのホーム画面に追加しておくと便利です（共有 → ホーム画面に追加）</p>
        </div>
      )}
    </div>
  );
}
