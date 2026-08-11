"use client";

import { nav } from "@/lib/content";

export default function Header() {
  return (
    <header className="fixed top-0 z-50 w-full border-b border-orange-100 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <a href="#" className="text-sm font-bold text-accent-orange">
          ひらかたNPO
        </a>
        <nav className="flex gap-4 overflow-x-auto text-xs font-medium text-text-secondary">
          {nav.items.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="whitespace-nowrap transition-colors hover:text-accent-orange"
            >
              {item.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
