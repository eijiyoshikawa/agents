import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { signSession, verifySession, SESSION_COOKIE } from "@/lib/session";
import { hasRole, verifyHubSession } from "@/lib/hub-session";

// 経営ハブ（hub.let-inc.net）の共通ログイン。let_hub Cookie は親ドメイン .let-inc.net 全体に送られるため、
// sales.let-inc.net で開いたときだけ有効（*.vercel.app では従来の ID/パスワード）。管理職以上を通す。
const HUB_MIN_ROLE = "manager" as const;

const PUBLIC_PATHS = ["/login", "/signup"];
// Vercel Cron が叩くエンドポイント（CRON_SECRET でルート側が認証）
const CRON_PATHS = ["/api/warm", "/api/weekly-summary", "/api/daily-summary", "/api/sync"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 認証API・ログイン/登録ページ・Cronは素通り
  if (pathname.startsWith("/api/auth") || CRON_PATHS.includes(pathname) || PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);
  if (session) return NextResponse.next();

  // 共通ログイン: ハブでログイン済みなら、このアプリのセッションを発行して通す（既存の API はそのまま動く）
  const hub = await verifyHubSession(req.cookies.get("let_hub")?.value, process.env.HUB_SESSION_SECRET);
  if (hub && hasRole(hub.role, HUB_MIN_ROLE)) {
    const res = NextResponse.next();
    const minted = await signSession({ uid: `hub:${hub.email}`, name: hub.name || hub.email, iat: Date.now() });
    res.cookies.set(SESSION_COOKIE, minted, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: Math.max(60, hub.exp - Math.floor(Date.now() / 1000)) });
    return res;
  }

  // 未認証
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ ok: false, error: "認証が必要です" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // 静的アセット以外すべてに適用
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
