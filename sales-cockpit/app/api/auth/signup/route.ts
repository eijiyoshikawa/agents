import { NextResponse } from "next/server";
import { hashPassword, SIGNUP_CODE } from "@/lib/auth";
import { signSession, SESSION_COOKIE } from "@/lib/session";
import { findUserByLoginId, createUser } from "@/lib/notion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { name, userId, password, code } = await req.json();
    if (!name || !userId || !password) {
      return NextResponse.json({ ok: false, error: "名前・ID・パスワードは必須です" }, { status: 400 });
    }
    if (!SIGNUP_CODE) {
      return NextResponse.json(
        { ok: false, error: "参加コードが未設定です。管理者は Vercel の環境変数 SIGNUP_CODE を設定してください。" },
        { status: 403 },
      );
    }
    if (String(code).trim() !== SIGNUP_CODE) {
      return NextResponse.json({ ok: false, error: "参加コードが違います" }, { status: 403 });
    }
    if (String(password).length < 6) {
      return NextResponse.json({ ok: false, error: "パスワードは6文字以上にしてください" }, { status: 400 });
    }
    const existing = await findUserByLoginId(userId);
    if (existing) {
      return NextResponse.json({ ok: false, error: "そのIDは既に使われています" }, { status: 409 });
    }
    await createUser({ name, userId, passwordHash: hashPassword(password) });
    const token = await signSession({ uid: userId, name, iat: Date.now() });
    const res = NextResponse.json({ ok: true });
    setCookie(res, token);
    return res;
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "登録に失敗しました" }, { status: 500 });
  }
}

function setCookie(res: NextResponse, token: string) {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}
