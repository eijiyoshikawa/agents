"use server";

import { auth } from "@/auth";
import { findMemberRecord, setMemberPassword } from "@/lib/member-store";
import { hashPassword, verifyPassword } from "@/lib/password";

export type PasswordState = { ok: boolean; message: string };

export async function changePasswordAction(_prev: PasswordState, fd: FormData): Promise<PasswordState> {
  const session = await auth();
  if (!session?.user?.email) return { ok: false, message: "ログインが必要です" };
  const rec = await findMemberRecord(session.user.email).catch(() => undefined);
  if (!rec) return { ok: false, message: "設定ファイルのメンバーのパスワードは管理者が環境変数で変更します" };
  const current = String(fd.get("current") ?? "");
  const next = String(fd.get("next") ?? "");
  const confirm = String(fd.get("confirm") ?? "");
  if (!verifyPassword(current, rec.passwordHash ?? undefined)) return { ok: false, message: "現在のパスワードが違います" };
  if (next.length < 10) return { ok: false, message: "新しいパスワードは 10 文字以上にしてください" };
  if (next === current) return { ok: false, message: "現在のパスワードと同じです" };
  if (next !== confirm) return { ok: false, message: "確認用のパスワードが一致しません" };
  await setMemberPassword(rec.email, hashPassword(next), false, rec.email);
  return { ok: true, message: "変更しました。再ログインすると新しいパスワードが有効になります。" };
}
