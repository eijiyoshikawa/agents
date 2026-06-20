import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "PartnerSales — 紹介報酬管理",
  description: "サービス別の3段階紹介報酬・パートナーツリー管理",
};

const nav = [
  { href: "/", label: "ダッシュボード" },
  { href: "/services", label: "サービス・報酬" },
  { href: "/admin", label: "スタッフ管理" },
  { href: "/login", label: "パートナーログイン" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <header className="glass" style={{ position: "sticky", top: 0, zIndex: 20, borderBottom: "1px solid var(--card-border)" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "12px 24px", display: "flex", alignItems: "center", gap: 24 }}>
            <Link href="/" style={{ fontWeight: 700, fontSize: 16 }}>
              <span className="gradient-text">PartnerSales</span>
            </Link>
            <nav style={{ display: "flex", gap: 8 }}>
              {nav.map((n) => (
                <Link key={n.href} href={n.href} className="nav-item">
                  {n.label}
                </Link>
              ))}
            </nav>
            <span className="pill" style={{ marginLeft: "auto" }}>
              <span className="live-dot" /> v0 事前準備
            </span>
          </div>
        </header>
        <main style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 24px 64px" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
