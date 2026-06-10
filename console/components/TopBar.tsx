"use client";
import { Search, Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { useConsole } from "./ConsoleProviders";

export default function TopBar() {
  const { isAdmin } = useConsole();
  const [isMac, setIsMac] = useState(false);
  useEffect(() => { setIsMac(typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform)); }, []);

  const openPalette = () => {
    const ev = new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true });
    window.dispatchEvent(ev);
  };

  return (
    <div className="h-14 border-b flex items-center px-6 gap-4 glass sticky top-0 z-20" style={{ borderColor: "var(--card-border)" }}>
      <button
        onClick={openPalette}
        className="flex-1 max-w-md relative text-left"
        aria-label="検索"
      >
        <span className="flex items-center gap-2 w-full pl-3 pr-2 py-1.5 text-sm rounded-lg border bg-transparent text-[var(--fg-muted)] hover:bg-[var(--hover)] transition"
              style={{ borderColor: "var(--card-border)" }}>
          <Search className="w-4 h-4" />
          <span className="flex-1">検索（エージェント・プロジェクト・レポート）</span>
          <kbd className="text-[10px] px-1.5 py-0.5 rounded border" style={{ borderColor: "var(--card-border)" }}>
            {isMac ? "⌘K" : "Ctrl+K"}
          </kbd>
        </span>
      </button>
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
