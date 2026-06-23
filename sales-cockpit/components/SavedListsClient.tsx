"use client";

import { useState } from "react";
import Link from "next/link";
import { Trash2, PhoneCall, Filter } from "lucide-react";
import type { SavedList } from "@/lib/notion";

function callsHref(filters: SavedList["filters"]): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) if (v) p.set(k, String(v));
  const qs = p.toString();
  return qs ? `/calls?${qs}` : "/calls";
}

function filterLabel(filters: SavedList["filters"]): string {
  const parts: string[] = [];
  if (filters.q) parts.push(`検索:${filters.q}`);
  if (filters.rep) parts.push(`IS:${filters.rep}`);
  if (filters.status) parts.push(filters.status);
  if (filters.rank) parts.push(`見込${filters.rank}`);
  if (filters.industry) parts.push(filters.industry);
  return parts.length ? parts.join(" / ") : "条件なし（全件）";
}

export default function SavedListsClient({ lists }: { lists: SavedList[] }) {
  const [items, setItems] = useState(lists);
  const [busy, setBusy] = useState<string | null>(null);

  const remove = async (pageId: string) => {
    if (!confirm("このリストを削除しますか？")) return;
    setBusy(pageId);
    try {
      const res = await fetch("/api/lists", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId }),
      });
      const data = await res.json();
      if (data.ok) setItems((xs) => xs.filter((x) => x.pageId !== pageId));
    } finally {
      setBusy(null);
    }
  };

  if (items.length === 0) {
    return (
      <div className="card p-8 text-center text-sm text-ink-muted">
        保存済みのリストはありません。<br />
        「架電リスト・発信」で絞り込み → <span className="text-ink">現在の条件をリスト保存</span> から作成できます。
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {items.map((l) => (
        <div key={l.pageId} className="card p-4 flex flex-col gap-2 animate-growFromBottom">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-ink">{l.name}</h3>
            <button
              onClick={() => remove(l.pageId)}
              disabled={busy === l.pageId}
              className="p-1.5 rounded-lg text-ink-muted hover:bg-white/10 disabled:opacity-50"
              title="削除"
            >
              <Trash2 size={14} />
            </button>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-ink-muted">
            <Filter size={12} /> {filterLabel(l.filters)}
          </div>
          <div className="text-xs text-ink-muted">
            {l.count.toLocaleString()} 件 ・ {l.creator || "?"} ・ {l.createdTime?.slice(0, 10)}
          </div>
          <Link
            href={callsHref(l.filters)}
            className="mt-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-medium hover:bg-brand-soft transition-colors"
          >
            <PhoneCall size={13} /> このリストを開く
          </Link>
        </div>
      ))}
    </div>
  );
}
