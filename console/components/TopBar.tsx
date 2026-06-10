"use client";
import { Search, Bell } from "lucide-react";
import { useConsole } from "./ConsoleProviders";

export default function TopBar() {
  const { isAdmin } = useConsole();
  return (
    <div className="h-14 border-b flex items-center px-6 gap-4 glass sticky top-0 z-20" style={{ borderColor: "var(--card-border)" }}>
      <div className="flex-1 max-w-md relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
        <input
          placeholder="検索（エージェント・プロジェクト・レポート）"
          className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border bg-transparent placeholder:text-[var(--fg-muted)] focus:outline-none focus:ring-2 focus:ring-brand-glow/30"
          style={{ borderColor: "var(--card-border)" }}
        />
        <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--fg-muted)] px-1.5 py-0.5 rounded border" style={{ borderColor: "var(--card-border)" }}>
          ⌘K
        </kbd>
      </div>
      <div className="flex items-center gap-3">
        {isAdmin && (
          <span className="pill pill-brand">
            <span className="live-dot" /> 管理者
          </span>
        )}
        <button className="p-2 rounded-lg hover:bg-[var(--hover)] transition">
          <Bell className="w-4 h-4 text-[var(--fg-soft)]" />
        </button>
      </div>
    </div>
  );
}
