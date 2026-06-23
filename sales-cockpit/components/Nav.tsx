"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PhoneCall,
  BarChart3,
  Target,
  Bookmark,
  Wallet,
  FileText,
  CalendarClock,
  GitBranch,
  RefreshCw,
  Copy,
  TrendingUp,
  ShieldCheck,
  LogOut,
  UserCircle2,
} from "lucide-react";
import clsx from "clsx";

const LINKS = [
  { href: "/", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/analytics", label: "分析", icon: BarChart3 },
  { href: "/report", label: "レポート", icon: FileText },
  { href: "/calls", label: "架電リスト", icon: PhoneCall },
  { href: "/followups", label: "フォロー", icon: CalendarClock },
  { href: "/lists", label: "保存リスト", icon: Bookmark },
  { href: "/pipeline", label: "商談", icon: GitBranch },
  { href: "/mrr", label: "MRR", icon: Wallet },
  { href: "/renewals", label: "更新/解約", icon: RefreshCw },
  { href: "/performance", label: "実績", icon: TrendingUp },
  { href: "/duplicates", label: "重複", icon: Copy },
  { href: "/quality", label: "品質", icon: ShieldCheck },
  { href: "/settings/targets", label: "目標設定", icon: Target },
];

export default function Nav({ userName }: { userName: string | null }) {
  const pathname = usePathname();
  const onAuthPage = pathname === "/login" || pathname === "/signup";

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <header className="sticky top-0 z-20 bg-night-0/70 backdrop-blur border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 h-14 flex items-center gap-6">
        <Link href="/" className="font-bold tracking-tight text-ink flex items-center gap-2 shrink-0">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-brand animate-pulseDot" />
          LET 営業コックピット
        </Link>

        {userName && !onAuthPage && (
          <nav className="flex items-center gap-1 overflow-x-auto">
            {LINKS.map(({ href, label, icon: Icon }) => {
              const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={clsx(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors duration-200 ease-standard",
                    active ? "bg-brand/15 text-brand-glow" : "text-ink-muted hover:text-ink hover:bg-white/[0.06]",
                  )}
                >
                  <Icon size={16} />
                  {label}
                </Link>
              );
            })}
          </nav>
        )}

        {userName && (
          <div className="ml-auto flex items-center gap-3 shrink-0">
            <span className="hidden sm:flex items-center gap-1.5 text-sm text-ink-muted">
              <UserCircle2 size={16} />
              {userName}
            </span>
            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-ink-muted hover:text-ink hover:bg-white/[0.06] transition-colors"
              title="ログアウト"
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">ログアウト</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
