"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { hubDbConfigured } from "@/lib/db";
import { allDashboardKeys } from "@/lib/dashboards";
import { deleteMemberRecord, listMemberRecords, setMemberActive, setMemberPassword, upsertMemberRecord } from "@/lib/member-store";
import { configMembers, normalizeEmail } from "@/lib/members";
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
    // ログインできるサイト: 「すべて」なら null（役割で見られる全部）、それ以外はチェックしたサイトの key だけ
    const allowAll = String(fd.get("allow_all") ?? "") === "1";
    const valid = new Set(allDashboardKeys().map((d) => d.key));
    const allow = allowAll ? null : fd.getAll("allow").map(String).filter((k) => valid.has(k));
    if (allow && allow.length === 0) return { ok: false, message: "ログインできるサイトを 1 つ以上チェックするか、「すべてのサイト」を選んでください" };
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

export type RowActionState = { ok: boolean; message: string; initialPassword?: string; email?: string };

/** 一覧の行から初期パスワードを再発行する（本人には次回ログイン時に変更を求める） */
export async function reissuePasswordAction(_prev: RowActionState, fd: FormData): Promise<RowActionState> {
  try {
    const actor = await requireExec();
    const email = normalizeEmail(String(fd.get("email") ?? ""));
    if (!email) return { ok: false, message: "メールアドレスが不正です" };
    const existing = (await listMemberRecords()).find((m) => m.email === email);
    if (!existing) return { ok: false, message: "登録メンバーに見つかりません" };
    const initialPassword = generatePassword();
    await setMemberPassword(email, hashPassword(initialPassword), true, actor);
    revalidatePath("/admin/members");
    return { ok: true, message: `${existing.name} のパスワードを再発行しました`, initialPassword, email };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "再発行に失敗しました" };
  }
}

/** メンバーを完全に削除する（自分自身は削除できない） */
export async function deleteMemberAction(_prev: RowActionState, fd: FormData): Promise<RowActionState> {
  try {
    const actor = await requireExec();
    const email = normalizeEmail(String(fd.get("email") ?? ""));
    if (!email) return { ok: false, message: "メールアドレスが不正です" };
    if (email === actor) return { ok: false, message: "自分自身は削除できません（他の役員に依頼してください）" };
    await deleteMemberRecord(email);
    revalidatePath("/admin/members");
    return { ok: true, message: `${email} を削除しました` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "削除に失敗しました" };
  }
}

/**
 * 設定ファイル（config/members.json）の役員を DB に取り込み、画面から編集・パスワード再発行・無効化できるようにする。
 * DB のメンバーは設定ファイルより優先されるので、取り込んだ時点で初期パスワードが新しくなる（1 回だけ表示）。
 */
export async function importConfigMemberAction(_prev: RowActionState, fd: FormData): Promise<RowActionState> {
  try {
    const actor = await requireExec();
    const email = normalizeEmail(String(fd.get("email") ?? ""));
    const cfg = configMembers().find((m) => m.email === email);
    if (!email || !cfg) return { ok: false, message: "設定ファイルのメンバーに見つかりません" };
    if ((await listMemberRecords()).some((m) => m.email === email)) return { ok: false, message: "すでに登録メンバーにあります（下の一覧から編集してください）" };
    await upsertMemberRecord({ email, name: cfg.name, role: cfg.role, allow: cfg.allow ?? null, active: true }, actor);
    const initialPassword = generatePassword();
    await setMemberPassword(email, hashPassword(initialPassword), true, actor);
    revalidatePath("/admin/members");
    return { ok: true, message: `${cfg.name} を登録メンバーに取り込みました。以後は下の一覧から編集できます`, initialPassword, email };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "取り込みに失敗しました" };
  }
}
