import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

export const runtime = "nodejs";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  // 共通ログイン経由の場合は、親ドメインの let_hub Cookie も消す（独自ドメインで開いているときだけ効く）
  const hubDomain = process.env.HUB_COOKIE_DOMAIN;
  if (hubDomain) res.cookies.set("let_hub", "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", domain: hubDomain, maxAge: 0 });
  return res;
}
