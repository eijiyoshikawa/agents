"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { hubDbConfigured } from "@/lib/db";
import { allDashboardKeys } from "@/lib/dashboards";
import { listMemberRecords, setMemberActive, setMemberPassword, upsertMemberRecord } from "@/lib/member-store";
import { normalizeEmail } from "@/lib/members";
import { generatePassword, hashPassword } from "@/lib/password";
import { isRole, type Role } from "@/lib/roles";

export type MemberFormState = { ok: boolean; message: string; initialPassword?: string; email?: string };

async function requireExec(): Promise<string> {
  const session = await auth();
  if (!session?.user?.email || session.user.role !== "exec") throw new Error("この操作は役員のみ行えます");
  if (!hubDbConfigured()) throw new Error("メンバー保存先（HUB_DATABASE_URL）が未設定です");
  return session.user.email;
}

/** メンバーの追加・更新。新規または「パスワードを再発行」のときは初期パスワードを生成して 1 回だけ表示する */
export async function saveMemberAction(_prev: MemberFormState, fd: FormData): Promise<MemberFormState> {
  try {
    const actor = await requireExec();
    const email = normalizeEmail(String(fd.get("email") ?? ""));
    const name = String(fd.get("name") ?? "").trim();
    const roleRaw = String(fd.get("role") ?? "staff");
    if (!email) return { ok: false, message: "メールアドレスの形式が不正です" };
    if (!name) return { ok: false, message: "氏名を入力してください" };
    if (!isRole(roleRaw)) return { ok: false, message: "役割が不正です" };
    const role: Role = roleRaw;
    const allowAll = String(fd.get("allow_mode") ?? "all") === "all";
    const valid = new Set(allDashboardKeys().map((d) => d.key));
    const allow = allowAll ? null : fd.getAll("allow").map(String).filter((k) => valid.has(k));
    const existing = (await listMemberRecords()).find((m) => m.email === email);
    await upsertMemberRecord({ email, name, role, allow, active: true }, actor);
    const reset = String(fd.get("reset_password") ?? "") === "1";
    let initialPassword: string | undefined;
    if (!existing || !existing.hasPassword || reset) {
      initialPassword = generatePassword();
      await setMemberPassword(email, hashPassword(initialPassword), true, actor);
    }
    revalidatePath("/admin/members");
    return { ok: true, message: existing ? "更新しました" : "追加しました", initialPassword, email };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "保存に失敗しました" };
  }
}

export async function toggleActiveAction(fd: FormData): Promise<void> {
  const actor = await requireExec();
  const email = normalizeEmail(String(fd.get("email") ?? ""));
  if (!email) return;
  await setMemberActive(email, String(fd.get("active")) === "1", actor);
  revalidatePath("/admin/members");
}
