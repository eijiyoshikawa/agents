"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, Network, Briefcase, FileText, BarChart3,
  CalendarDays, BookOpen, Settings, Sun, Moon, Monitor, Sparkles, ShieldCheck, LogOut,
} from "lucide-react";
import { useConsole } from "./ConsoleProviders";
import { useState } from "react";

const NAV = [
  { href: "/", label: "ダッシュボード", icon: LayoutDashboard, group: "view" },
  { href: "/agents", label: "エージェント", icon: Users, group: "view" },
  { href: "/org", label: "組織マップ", icon: Network, group: "view" },
  { href: "/projects", label: "プロジェクト", icon: Briefcase, group: "view" },
  { href: "/documents", label: "書類作成", icon: FileText, group: "create" },
  { href: "/analytics", label: "分析", icon: BarChart3, group: "view" },
  { href: "/reports", label: "日次レポート", icon: CalendarDays, group: "view" },
  { href: "/learnings", label: "ナレッジ", icon: BookOpen, group: "view" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { theme, setTheme, isAdmin, isVisible } = useConsole();
  const [collapsed, setCollapsed] = useState(false);

  const visibleNav = NAV.filter((n) => isVisible(n.href));

  return (
    <aside
      className={`shrink-0 border-r flex flex-col transition-all duration-300 ${collapsed ? "w-16" : "w-60"}`}
      style={{ borderColor: "var(--card-border)", background: "var(--card)" }}
    >
      <div className="p-4 flex items-center gap-2.5 border-b" style={{ borderColor: "var(--card-border)" }}>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-glow to-accent-indigo flex items-center justify-center shadow-glow-brand">
          <Sparkles className="w-4 h-4 text-white" strokeWidth={2.5} />
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold tracking-tight leading-none">AI Agents</div>
            <div className="text-[10px] uppercase tracking-widest text-ink-muted mt-1">Console</div>
          </div>
        )}
      </div>

      <nav className="flex-1 p-2 overflow-y-auto scrollbar-thin">
        {!collapsed && <div className="h-section px-2 py-2">閲覧</div>}
        <ul className="space-y-0.5">
          {visibleNav.filter((n) => n.group === "view").map((n) => {
            const active = pathname === n.href || (n.href !== "/" && pathname.startsWith(n.href));
            const Icon = n.icon;
            return (
              <li key={n.href}>
                <Link href={n.href} className={`nav-item ${active ? "active" : ""}`} title={collapsed ? n.label : undefined}>
                  <Icon className="w-4 h-4 shrink-0" strokeWidth={2} />
                  {!collapsed && <span>{n.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
        {!collapsed && <div className="h-section px-2 py-2 mt-4">作成</div>}
        <ul className="space-y-0.5">
          {visibleNav.filter((n) => n.group === "create").map((n) => {
            const active = pathname.startsWith(n.href);
            const Icon = n.icon;
            return (
              <li key={n.href}>
                <Link href={n.href} className={`nav-item ${active ? "active" : ""}`} title={collapsed ? n.label : undefined}>
                  <Icon className="w-4 h-4 shrink-0" strokeWidth={2} />
                  {!collapsed && <span>{n.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-2 border-t space-y-1" style={{ borderColor: "var(--card-border)" }}>
        {!collapsed && (
          <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: "var(--hover)" }}>
            <ThemeBtn current={theme} value="light" onSelect={setTheme} icon={Sun} label="Light" />
            <ThemeBtn current={theme} value="dark" onSelect={setTheme} icon={Moon} label="Dark" />
            <ThemeBtn current={theme} value="system" onSelect={setTheme} icon={Monitor} label="Auto" />
          </div>
        )}
        <Link href="/admin" className={`nav-item ${pathname === "/admin" ? "active" : ""}`}>
          {isAdmin ? <ShieldCheck className="w-4 h-4 shrink-0 text-brand-glow" strokeWidth={2} /> : <Settings className="w-4 h-4 shrink-0" strokeWidth={2} />}
          {!collapsed && <span>{isAdmin ? "管理者モード" : "管理者ログイン"}</span>}
          {!collapsed && isAdmin && <span className="ml-auto live-dot" />}
        </Link>
        <button onClick={() => setCollapsed((c) => !c)} className="nav-item w-full">
          <LogOut className={`w-4 h-4 shrink-0 transition-transform ${collapsed ? "rotate-180" : ""}`} strokeWidth={2} />
          {!collapsed && <span>サイドバーを畳む</span>}
        </button>
      </div>
    </aside>
  );
}

function ThemeBtn({ current, value, onSelect, icon: Icon, label }: { current: string; value: "light" | "dark" | "system"; onSelect: (v: "light" | "dark" | "system") => void; icon: any; label: string }) {
  const active = current === value;
  return (
    <button
      onClick={() => onSelect(value)}
      className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-md text-xs transition ${active ? "bg-[var(--card)] shadow-sm text-[var(--fg)]" : "text-[var(--fg-muted)] hover:text-[var(--fg)]"}`}
      title={label}
    >
      <Icon className="w-3.5 h-3.5" strokeWidth={2} />
    </button>
  );
}
