"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Users, Briefcase, FileText, CalendarDays, Sparkles, FolderOpen,
  LayoutDashboard, Settings, Palette,
} from "lucide-react";
import searchIndex from "@/data/search-index.json";

type Item = { kind: string; id?: string; label: string; sub?: string; href: string; keywords?: string };

const ICON: Record<string, any> = {
  agent: Users, project: Briefcase, report: CalendarDays, template: FileText,
  drive: FolderOpen, design: Palette, page: LayoutDashboard, default: Sparkles,
};

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 50); }, [open]);

  const items = searchIndex as Item[];
  const filtered = useMemo(() => {
    if (!q.trim()) return items.slice(0, 20);
    const lq = q.toLowerCase();
    return items
      .map((it) => ({ it, score: scoreMatch(it, lq) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 30)
      .map((x) => x.it);
  }, [q, items]);

  useEffect(() => { setActive(0); }, [q]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(filtered.length - 1, a + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      const hit = filtered[active];
      if (hit) { setOpen(false); setQ(""); router.push(hit.href); }
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 md:pt-24 animate-fadeIn" onClick={() => setOpen(false)}>
      <div className="absolute inset-0 backdrop-blur-sm" style={{ background: "rgba(10,10,14,.4)" }} />
      <div
        className="relative w-full max-w-xl rounded-2xl shadow-2xl border overflow-hidden animate-growFromBottom"
        style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "var(--card-border)" }}>
          <Search className="w-4 h-4 text-[var(--fg-muted)]" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="エージェント・プロジェクト・レポート・ページを検索..."
            className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-[var(--fg-muted)]"
          />
          <kbd className="text-[10px] text-[var(--fg-muted)] px-1.5 py-0.5 rounded border" style={{ borderColor: "var(--card-border)" }}>ESC</kbd>
        </div>
        <ul className="max-h-[420px] overflow-y-auto scrollbar-thin py-1">
          {filtered.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-[var(--fg-muted)]">該当なし</li>
          ) : filtered.map((it, i) => {
            const Icon = ICON[it.kind] ?? ICON.default;
            const isActive = i === active;
            return (
              <li key={`${it.kind}-${it.id ?? it.label}-${i}`}>
                <button
                  onMouseEnter={() => setActive(i)}
                  onClick={() => { setOpen(false); setQ(""); router.push(it.href); }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition ${isActive ? "bg-[var(--hover)]" : ""}`}
                >
                  <Icon className="w-4 h-4 text-[var(--fg-muted)] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{it.label}</div>
                    {it.sub ? <div className="text-[11px] text-[var(--fg-muted)] truncate">{it.sub}</div> : null}
                  </div>
                  <span className="pill text-[10px]">{kindLabel(it.kind)}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <div className="border-t px-4 py-2 text-[11px] text-[var(--fg-muted)] flex items-center justify-between" style={{ borderColor: "var(--card-border)" }}>
          <span>↑↓ で移動 · ⏎ で開く</span>
          <span>{filtered.length} 件</span>
        </div>
      </div>
    </div>
  );
}

function kindLabel(k: string) {
  return { agent: "エージェント", project: "プロジェクト", report: "レポート", template: "書類", drive: "Drive", design: "デザイン", page: "ページ" }[k] ?? k;
}

function scoreMatch(item: Item, q: string) {
  const label = item.label.toLowerCase();
  const sub = (item.sub ?? "").toLowerCase();
  const kw = (item.keywords ?? "").toLowerCase();
  let score = 0;
  if (label === q) score += 100;
  if (label.startsWith(q)) score += 50;
  if (label.includes(q)) score += 20;
  if (sub.includes(q)) score += 8;
  if (kw.includes(q)) score += 4;
  // Token boost
  const tokens = q.split(/\s+/).filter(Boolean);
  for (const t of tokens) {
    if (label.includes(t)) score += 6;
    if (kw.includes(t)) score += 2;
  }
  return score;
}
