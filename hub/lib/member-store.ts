/** DB 上のメンバー（hub_member）。Node ランタイム専用（middleware からは呼ばない）。 */
import { db, hubDbConfigured } from "./db";
import type { Role } from "./roles";
import { isRole } from "./roles";

export interface MemberRecord {
  email: string;
  name: string;
  role: Role;
  allow: string[] | null;
  active: boolean;
  hasPassword: boolean;
  mustChangePassword: boolean;
  updatedAt: string;
}

const row = (r: Record<string, unknown>): MemberRecord => ({
  email: String(r.email),
  name: String(r.name),
  role: isRole(r.role) ? r.role : "staff",
  allow: Array.isArray(r.allow) ? (r.allow as unknown[]).map(String) : null,
  active: Boolean(r.active),
  hasPassword: Boolean(r.password_hash),
  mustChangePassword: Boolean(r.must_change_password),
  updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : String(r.updated_at ?? ""),
});

export async function findMemberRecord(email: string): Promise<(MemberRecord & { passwordHash: string | null }) | undefined> {
  if (!hubDbConfigured()) return undefined;
  const s = await db();
  const rows = await s`SELECT * FROM hub_member WHERE email = ${email.toLowerCase()} LIMIT 1`;
  if (!rows[0]) return undefined;
  return { ...row(rows[0]), passwordHash: (rows[0].password_hash as string | null) ?? null };
}

export async function listMemberRecords(): Promise<MemberRecord[]> {
  if (!hubDbConfigured()) return [];
  const s = await db();
  const rows = await s`SELECT * FROM hub_member ORDER BY role, name`;
  return rows.map(row);
}

export async function upsertMemberRecord(m: { email: string; name: string; role: Role; allow: string[] | null; active: boolean }, actor: string): Promise<void> {
  const s = await db();
  await s`INSERT INTO hub_member (email, name, role, allow, active, updated_by)
    VALUES (${m.email.toLowerCase()}, ${m.name}, ${m.role}, ${m.allow === null ? null : s.json(m.allow)}, ${m.active}, ${actor})
    ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role, allow = EXCLUDED.allow, active = EXCLUDED.active, updated_at = now(), updated_by = EXCLUDED.updated_by`;
}

export async function setMemberPassword(email: string, passwordHash: string, mustChange: boolean, actor: string): Promise<void> {
  const s = await db();
  await s`UPDATE hub_member SET password_hash = ${passwordHash}, must_change_password = ${mustChange}, updated_at = now(), updated_by = ${actor} WHERE email = ${email.toLowerCase()}`;
}

export async function setMemberActive(email: string, active: boolean, actor: string): Promise<void> {
  const s = await db();
  await s`UPDATE hub_member SET active = ${active}, updated_at = now(), updated_by = ${actor} WHERE email = ${email.toLowerCase()}`;
}

/** メンバーを完全に削除する（退職等。履歴は残らない。一時停止なら setMemberActive を使う） */
export async function deleteMemberRecord(email: string): Promise<void> {
  const s = await db();
  await s`DELETE FROM hub_member WHERE email = ${email.toLowerCase()}`;
}
