import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "建設業 x AI｜業務効率化 20の活用事例",
  description:
    "建設業界におけるAI活用事例を施工管理・安全管理・設計積算・営業事務・人材教育の5カテゴリ20項目で紹介。具体的な導入効果と実現方法をわかりやすく解説します。",
  openGraph: {
    title: "建設業 x AI｜業務効率化 20の活用事例",
    description:
      "施工管理・安全管理・設計積算・営業事務・人材教育 — 建設業界のAI活用を20事例で徹底解説",
    type: "website",
    locale: "ja_JP",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
