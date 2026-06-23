import "./globals.css";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Nav from "@/components/Nav";
import { verifySession, SESSION_COOKIE } from "@/lib/session";

export const metadata: Metadata = {
  title: "LET 営業コックピット",
  description: "Notion を単一ソースにした リード→契約→継続 一体型ダッシュボード",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);

  return (
    <html lang="ja">
      <body>
        <div className="min-h-screen flex flex-col">
          <Nav userName={session?.name ?? null} />
          <main className="flex-1 px-4 sm:px-8 py-6 animate-fadeIn">
            <div className="max-w-7xl mx-auto w-full">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
