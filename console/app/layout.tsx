import "./globals.css";
import type { Metadata } from "next";
import { ConsoleProviders } from "@/components/ConsoleProviders";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";

export const metadata: Metadata = {
  title: "Agents Console",
  description: "社内エージェント組織の可視化・書類作成・分析を一元化するコンソール",
};

const THEME_INIT = `(function(){try{var t=localStorage.getItem('console.theme')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body>
        <ConsoleProviders>
          <div className="min-h-screen flex">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
              <TopBar />
              <main className="flex-1 px-8 py-8 animate-fadeIn">
                <div className="max-w-7xl mx-auto w-full">{children}</div>
              </main>
            </div>
          </div>
        </ConsoleProviders>
      </body>
    </html>
  );
}
