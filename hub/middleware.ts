import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "./auth.config";
import { HUB_COOKIE, buildSession, hubCookieOptions, signHubSession, ttlSeconds, verifyHubSession } from "@/lib/hub-session";
import { isRole } from "@/lib/roles";

const { auth } = NextAuth(authConfig);

const PUBLIC_PATHS = ["/login"];

export default auth(async (req) => {
  const { pathname } = req.nextUrl;
  const user = req.auth?.user;
  const authed = Boolean(user?.email && isRole(user?.role));
  // ハブのログインが切れている（ログアウト・期限切れ）のに共通 Cookie が残っていたら、ここで消す。
  // これで「ハブをログアウトしたのに各ダッシュボードには入れる」状態を防ぐ
  const clearHub = (res: NextResponse) => {
    if (!authed && req.cookies.get(HUB_COOKIE)) res.cookies.set(HUB_COOKIE, "", { ...hubCookieOptions(), maxAge: 0 });
    return res;
  };

  if (pathname.startsWith("/api/auth") || PUBLIC_PATHS.includes(pathname)) {
    return clearHub(NextResponse.next());
  }

  if (!user?.email || !isRole(user.role)) {
    if (pathname.startsWith("/api/")) {
      return clearHub(NextResponse.json({ ok: false, error: "認証が必要です" }, { status: 401 }));
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return clearHub(NextResponse.redirect(url));
  }

  // 初回ログイン（仮パスワード）はパスワード変更が終わるまで他の画面に入れない
  if (user.mustChange && !pathname.startsWith("/account/password")) {
    const url = req.nextUrl.clone();
    url.pathname = "/account/password";
    url.search = "";
    return NextResponse.redirect(url);
  }
  // 管理画面は役員のみ
  if (pathname.startsWith("/admin") && user.role !== "exec") {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // ログイン済み: 共通セッション Cookie（let_hub）を発行・延長する。
  // 残り有効期間が半分を切ったら再発行し、各ダッシュボードへの遷移で切れないようにする。
  const res = NextResponse.next();
  const existing = await verifyHubSession(req.cookies.get(HUB_COOKIE)?.value);
  const now = Math.floor(Date.now() / 1000);
  const ttl = ttlSeconds();
  const stale = !existing || existing.email !== user.email || existing.role !== user.role || existing.name !== (user.name ?? user.email) || existing.exp - now < ttl / 2;
  if (stale && !user.mustChange) {
    const token = await signHubSession(buildSession({ email: user.email, name: user.name ?? user.email, role: user.role }, now, ttl));
    res.cookies.set(HUB_COOKIE, token, { ...hubCookieOptions(), maxAge: ttl });
  }
  return res;
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt).*)"],
};
