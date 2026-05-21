import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  variable: "--font-noto-sans-jp",
  display: "swap",
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "まちボード",
    template: "%s | まちボード",
  },
  description: "回覧板を、もっとかんたんに。自治会・町内会向けデジタル回覧板サービス",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "まちボード",
  },
};

export const viewport: Viewport = {
  themeColor: "#2980B9",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${notoSansJP.variable} h-full`}>
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            className: "text-lg",
            duration: 4000,
          }}
        />
      </body>
    </html>
  );
}
