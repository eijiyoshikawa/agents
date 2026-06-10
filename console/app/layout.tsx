import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Internal Console — AI Agent Organization",
  description: "社内エージェント組織の可視化・書類作成・分析を一元化するコンソール",
};

const NAV = [
  { href: "/", label: "ダッシュボード" },
  { href: "/agents", label: "エージェント" },
  { href: "/org", label: "組織マップ" },
  { href: "/projects", label: "プロジェクト" },
  { href: "/documents", label: "書類作成" },
  { href: "/analytics", label: "分析" },
  { href: "/reports", label: "日次レポート" },
  { href: "/learnings", label: "ナレッジ" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <div className="min-h-screen flex flex-col">
          <header className="border-b border-ink/10 bg-surface/80 backdrop-blur sticky top-0 z-10">
            <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-8">
              <Link href="/" className="font-bold text-ink text-lg tracking-tight">
                AI Agents <span className="text-brand">Console</span>
              </Link>
              <nav className="flex gap-1 text-sm overflow-x-auto">
                {NAV.map((n) => (
                  <Link key={n.href} href={n.href} className="px-3 py-1.5 rounded-md text-ink-soft hover:bg-ink/5 hover:text-ink whitespace-nowrap">
                    {n.label}
                  </Link>
                ))}
              </nav>
            </div>
          </header>
          <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8 animate-growFromBottom">
            {children}
          </main>
          <footer className="border-t border-ink/10 text-xs text-ink-muted text-center py-4">
            Internal Console · MVP · Static build
          </footer>
        </div>
      </body>
    </html>
  );
}
