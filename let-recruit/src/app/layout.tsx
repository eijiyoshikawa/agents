import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "株式会社LET｜求人票ジェネレーター",
  description:
    "他社求人URLを貼るだけで、LETデザインの求人票をWeb表示・PDF出力できる社内ツール。",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body className="antialiased">{children}</body>
    </html>
  );
}
