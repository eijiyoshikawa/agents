import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth/server";
import "./globals.css";

export const metadata: Metadata = {
  title: "PartnerSales — 紹介報酬管理",
  description: "サービス別の3段階紹介報酬・パートナーツリー管理",
};

const staffNav = [
  { href: "/", label: "ダッシュボード" },
  { href: "/services", label: "サービス・報酬" },
  { href: "/admin", label: "スタッフ管理" },
  { href: "/guide", label: "ガイド" },
];
const partnerNav = [
  { href: "/me", label: "マイページ" },
  { href: "/guide", label: "ガイド・シミュレーション" },
];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const nav = session?.role === "staff" ? staffNav : session?.role === "partner" ? partnerNav : [];

  return (
    <html lang="ja">
      <body>
        <header className="glass" style={{ position: "sticky", top: 0, zIndex: 20, borderBottom: "1px solid var(--card-border)" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "12px 24px", display: "flex", alignItems: "center", gap: 24 }}>
            <Link href={session?.role === "partner" ? "/me" : "/"} style={{ fontWeight: 700, fontSize: 16 }}>
              <span className="gradient-text">PartnerSales</span>
            </Link>
            <nav style={{ display: "flex", gap: 8 }}>
              {nav.map((n) => (
                <Link key={n.href} href={n.href} className="nav-item">{n.label}</Link>
              ))}
            </nav>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
              {session ? (
                <form action="/api/auth/logout" method="post">
                  <button className="btn btn-ghost" type="submit">ログアウト</button>
                </form>
              ) : (
                <span className="pill"><span className="live-dot" /> 要ログイン</span>
              )}
            </div>
          </div>
        </header>
        <main style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 24px 64px" }}>{children}</main>
      </body>
    </html>
  );
}
