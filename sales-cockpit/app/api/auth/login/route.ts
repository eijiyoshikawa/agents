import { NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth";
import { signSession, SESSION_COOKIE } from "@/lib/session";
import { findUserByLoginId, touchUserLogin } from "@/lib/notion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { userId, password } = await req.json();
    if (!userId || !password) {
      return NextResponse.json({ ok: false, error: "IDとパスワードを入力してください" }, { status: 400 });
    }
    const user = await findUserByLoginId(userId);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ ok: false, error: "IDまたはパスワードが違います" }, { status: 401 });
    }
    const token = await signSession({ uid: user.userId, name: user.name, iat: Date.now() });
    void touchUserLogin(user.pageId);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "ログインに失敗しました" }, { status: 500 });
  }
}
