import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LET 経営ハブ",
  description: "株式会社LET 全社ダッシュボードの統合入口",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
