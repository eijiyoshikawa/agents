import "./globals.css";
import type { Metadata } from "next";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "LET 営業コックピット",
  description: "Notion を単一ソースにした リード→契約→継続 一体型ダッシュボード",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <div className="min-h-screen flex flex-col">
          <Nav />
          <main className="flex-1 px-4 sm:px-8 py-6 animate-fadeIn">
            <div className="max-w-7xl mx-auto w-full">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
