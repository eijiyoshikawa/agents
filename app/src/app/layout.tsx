import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "求人ポータル | ノンデスク産業特化の求人サイト",
  description:
    "ドライバー・建設・製造業に特化した求人サイト。ハローワーク求人も掲載。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
