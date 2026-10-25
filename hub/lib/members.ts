import membersJson from "@/config/members.json";
import { isRole, type Role } from "./roles";

/** allow: null = 役割で見られる全項目。配列 = そのキーのダッシュボードだけ */
export type Member = { email: string; name: string; role: Role; allow?: string[] | null; mustChangePassword?: boolean };

type RawMember = { email: string; name: string; role: string; allow?: string[] };
const MEMBERS: Member[] = (membersJson.members as RawMember[])
  .filter((m) => isRole(m.role))
  .map((m) => ({ email: m.email.trim().toLowerCase(), name: m.name, role: m.role as Role, allow: m.allow ?? null }));

export function normalizeEmail(email: string | null | undefined): string | null {
  const e = (email ?? "").trim().toLowerCase();
  return e.includes("@") ? e : null;
}

/**
 * 設定ファイルと許可ドメインだけでメンバーを解決する（同期・Edge 可）。
 * 1) config/members.json に一致 → その役割
 * 2) HUB_ALLOWED_DOMAIN と一致するドメイン → staff
 * 3) それ以外 → null（ログイン拒否）
 */
export function resolveMember(
  email: string | null | undefined,
  fallbackName?: string | null,
  allowedDomain: string | undefined = process.env.HUB_ALLOWED_DOMAIN,
): Member | null {
  const e = normalizeEmail(email);
  if (!e) return null;
  const hit = MEMBERS.find((m) => m.email === e);
  if (hit) return hit;
  const domain = (allowedDomain ?? "").trim().toLowerCase().replace(/^@/, "");
  if (domain && e.endsWith(`@${domain}`)) {
    return { email: e, name: (fallbackName ?? "").trim() || e.split("@")[0], role: "staff", allow: null };
  }
  return null;
}

/** 設定ファイル上のメンバー一覧（管理画面の表示用） */
export function configMembers(): Member[] {
  return MEMBERS;
}

/**
 * DB（hub_member）→ 設定ファイル → 許可ドメイン の順でメンバーを解決する（Node 専用）。
 * DB のメンバーは active でなければ拒否。
 * cached: ログイン中の定期読み直し用。DB の行をキャッシュ経由で読む（書き込み時に即時無効化。lib/member-store.ts）。
 */
export async function findMember(
  email: string | null | undefined,
  fallbackName?: string | null,
  opts: { cached?: boolean } = {},
): Promise<Member | null> {
  const e = normalizeEmail(email);
  if (!e) return null;
  const { findMemberRecord, findMemberRecordCached } = await import("./member-store");
  const rec = await (opts.cached ? findMemberRecordCached(e) : findMemberRecord(e)).catch(() => undefined);
  if (rec) return rec.active ? { email: rec.email, name: rec.name, role: rec.role, allow: rec.allow, mustChangePassword: rec.mustChangePassword } : null;
  return resolveMember(e, fallbackName);
}
