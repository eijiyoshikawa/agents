import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

// ルートごとのアクセス制御:
//   - 公開:        /login, /staff/login, /api/auth/*
//   - パートナー:  /me
//   - スタッフ:    /, /admin, /services, /partners/*
const PUBLIC_PATHS = ["/login", "/staff/login"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 認証 API・静的アセットは素通し
  if (pathname.startsWith("/api/auth") || pathname.startsWith("/_next") || pathname === "/favicon.ico") {
    return NextResponse.next();
  }

  const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);

  if (PUBLIC_PATHS.includes(pathname)) {
    // ログイン済みなら各自のホームへ
    if (session?.role === "staff") return NextResponse.redirect(new URL("/", req.url));
    if (session?.role === "partner") return NextResponse.redirect(new URL("/me", req.url));
    return NextResponse.next();
  }

  // パートナー専用
  if (pathname === "/me") {
    if (session?.role === "partner") return NextResponse.next();
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // それ以外（ダッシュボード・管理・サービス・個別ページ）はスタッフ専用
  if (session?.role === "staff") return NextResponse.next();
  return NextResponse.redirect(new URL("/staff/login", req.url));
}

export const config = {
  // 認証フローと Next 内部以外の全ページに適用
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
