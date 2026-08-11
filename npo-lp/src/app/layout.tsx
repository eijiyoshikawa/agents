import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "支援を仕組みに変え、地域を創る — ひらかた子ども食堂支援NPO",
  description:
    "枚方市の子ども食堂を、みんなで支える仕組みをつくります。きくらげ栽培事業・セントラル倉庫・ふるさと納税型CFで持続可能な地域インフラを整備。",
  openGraph: {
    title: "支援を仕組みに変え、地域を創る — ひらかた子ども食堂支援NPO",
    description:
      "枚方市の子ども食堂を、みんなで支える仕組みをつくります。きくらげ栽培・セントラル倉庫・ふるさと納税型CFで持続可能な支援体制を構築。",
    locale: "ja_JP",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="antialiased">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
