import type { Metadata } from "next";
import "./globals.css";
import { getCompanyData } from "@/lib/data";

const data = getCompanyData();

export const metadata: Metadata = {
  title: `${data.company.name} 採用情報 | RECRUIT`,
  description: data.company.tagline ?? data.company.description ?? `${data.company.name}の採用ページ`,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="antialiased">{children}</body>
    </html>
  );
}
