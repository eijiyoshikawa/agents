"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, PhoneCall } from "lucide-react";
import clsx from "clsx";

const LINKS = [
  { href: "/", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/calls", label: "架電リスト・発信", icon: PhoneCall },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-20 bg-surface/90 backdrop-blur border-b border-ink/[0.07]">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 h-14 flex items-center gap-6">
        <Link href="/" className="font-bold tracking-tight text-ink flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-brand animate-pulseDot" />
          LET 営業コックピット
        </Link>
        <nav className="flex items-center gap-1">
          {LINKS.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200 ease-standard",
                  active ? "bg-brand/10 text-brand" : "text-ink-muted hover:text-ink hover:bg-ink/[0.04]",
                )}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
