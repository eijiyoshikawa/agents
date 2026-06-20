// サーバコンポーネント／サーバアクション／ルートハンドラ用のセッション取得・要求ヘルパー。
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  createSessionToken,
  verifySessionToken,
  type Session,
} from "./session";

/** 現在のセッションを取得（未ログインなら null） */
export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

/** セッション Cookie を設定 */
export async function setSessionCookie(
  payload: Parameters<typeof createSessionToken>[0]
): Promise<void> {
  const token = await createSessionToken(payload);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

/** セッション Cookie を破棄（ログアウト） */
export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** スタッフ権限を要求（無ければスタッフログインへ） */
export async function requireStaff(): Promise<void> {
  const s = await getSession();
  if (s?.role !== "staff") redirect("/staff/login");
}

/** パートナー権限を要求（無ければログインへ） */
export async function requirePartner(): Promise<Extract<Session, { role: "partner" }>> {
  const s = await getSession();
  if (s?.role !== "partner") redirect("/login");
  return s;
}
