"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PlusCircle, Settings, LayoutDashboard } from "lucide-react";
import { UnreadBadge } from "@/components/ui/badge";

interface BottomNavProps {
  isAdmin?: boolean;
  unreadCount?: number;
}

export function BottomNav({ isAdmin = false, unreadCount = 0 }: BottomNavProps) {
  const pathname = usePathname();

  const items = [
    { href: "/", label: "ホーム", icon: Home, badge: unreadCount },
    ...(isAdmin
      ? [
          { href: "/new", label: "投稿", icon: PlusCircle, badge: 0 },
          { href: "/admin/dashboard", label: "管理", icon: LayoutDashboard, badge: 0 },
        ]
      : []),
    { href: "/settings", label: "設定", icon: Settings, badge: 0 },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-neutral-200 pb-safe md:hidden"
      role="navigation"
      aria-label="メインナビゲーション"
    >
      <ul className="flex items-center justify-around h-16">
        {items.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors min-w-14 ${
                  isActive
                    ? "text-primary-500 bg-primary-50"
                    : "text-neutral-500 hover:text-neutral-700"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <span className="relative">
                  <Icon className="size-7" aria-hidden="true" />
                  {item.badge > 0 && (
                    <span className="absolute -top-1.5 -right-2.5">
                      <UnreadBadge count={item.badge} />
                    </span>
                  )}
                </span>
                <span className="text-xs font-semibold">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
