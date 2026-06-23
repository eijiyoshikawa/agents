import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySession, SESSION_COOKIE } from "@/lib/session";

const PUBLIC_PATHS = ["/login", "/signup"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 認証API・ログイン/登録ページは素通り
  if (pathname.startsWith("/api/auth") || PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);
  if (session) return NextResponse.next();

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
