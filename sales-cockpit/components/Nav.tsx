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
  History,
  CalendarCheck,
  ShieldCheck,
  LogOut,
  UserCircle2,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";
import clsx from "clsx";

type Item = { href: string; label: string; icon: LucideIcon };
type Group = { label: string; icon: LucideIcon; items: Item[] };

// 単独リンク（ダッシュボード）＋ グループ（マウスホバーで展開）。
const HOME: Item = { href: "/", label: "ダッシュボード", icon: LayoutDashboard };

const GROUPS: Group[] = [
  {
    label: "営業活動",
    icon: PhoneCall,
    items: [
      { href: "/today", label: "本日の架電", icon: CalendarCheck },
      { href: "/calls", label: "架電リスト", icon: PhoneCall },
      { href: "/followups", label: "フォロー / 再コール", icon: CalendarClock },
      { href: "/lists", label: "保存リスト", icon: Bookmark },
      { href: "/pipeline", label: "商談パイプライン", icon: GitBranch },
    ],
  },
  {
    label: "実績・分析",
    icon: TrendingUp,
    items: [
      { href: "/history", label: "月次実績の推移", icon: History },
      { href: "/performance", label: "目標 vs 実績", icon: TrendingUp },
      { href: "/analytics", label: "分析", icon: BarChart3 },
      { href: "/report", label: "レポート", icon: FileText },
    ],
  },
  {
    label: "収益",
    icon: Wallet,
    items: [
      { href: "/mrr", label: "MRR", icon: Wallet },
      { href: "/renewals", label: "更新 / 解約", icon: RefreshCw },
    ],
  },
  {
    label: "データ",
    icon: ShieldCheck,
    items: [
      { href: "/duplicates", label: "重複チェック", icon: Copy },
      { href: "/quality", label: "データ品質", icon: ShieldCheck },
    ],
  },
  {
    label: "設定",
    icon: Target,
    items: [{ href: "/settings/targets", label: "目標設定", icon: Target }],
  },
];

export default function Nav({ userName }: { userName: string | null }) {
  const pathname = usePathname();
  const onAuthPage = pathname === "/login" || pathname === "/signup";

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <header className="sticky top-0 z-20 bg-night-0/70 backdrop-blur border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 h-14 flex items-center gap-4">
        <Link href="/" className="font-bold tracking-tight text-ink flex items-center gap-2 shrink-0">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-brand animate-pulseDot" />
          LET Sales System
        </Link>

        {userName && !onAuthPage && (
          <nav className="flex items-center gap-1">
            <Link
              href={HOME.href}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors duration-200 ease-standard",
                isActive(HOME.href)
                  ? "bg-brand/15 text-brand-glow"
                  : "text-ink-muted hover:text-ink hover:bg-white/[0.06]",
              )}
            >
              <HOME.icon size={16} />
              <span className="hidden md:inline">{HOME.label}</span>
            </Link>

            {GROUPS.map((g) => {
              const groupActive = g.items.some((it) => isActive(it.href));
              const GIcon = g.icon;
              return (
                <div key={g.label} className="relative group">
                  {/* グループ見出し（クリックで先頭ページ・ホバーで展開） */}
                  <Link
                    href={g.items[0].href}
                    className={clsx(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors duration-200 ease-standard cursor-pointer",
                      groupActive
                        ? "bg-brand/15 text-brand-glow"
                        : "text-ink-muted hover:text-ink hover:bg-white/[0.06]",
                    )}
                  >
                    <GIcon size={16} />
                    <span className="hidden md:inline">{g.label}</span>
                    <ChevronDown
                      size={13}
                      className="opacity-60 transition-transform duration-200 group-hover:rotate-180"
                    />
                  </Link>

                  {/* ホバーで展開するドロップダウン（pt-2 でボタンとの隙間を橋渡し） */}
                  <div className="absolute left-0 top-full pt-2 hidden group-hover:block animate-fadeIn">
                    <div className="min-w-52 rounded-xl bg-night-1 ring-1 ring-white/10 shadow-lift p-1.5">
                      {g.items.map((it) => {
                        const IIcon = it.icon;
                        return (
                          <Link
                            key={it.href}
                            href={it.href}
                            className={clsx(
                              "flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors",
                              isActive(it.href)
                                ? "bg-brand/15 text-brand-glow"
                                : "text-ink-soft hover:text-ink hover:bg-white/[0.06]",
                            )}
                          >
                            <IIcon size={15} className="shrink-0" />
                            {it.label}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
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
