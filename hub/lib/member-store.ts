/** DB 上のメンバー（hub_member）。Node ランタイム専用（middleware からは呼ばない）。 */
import { revalidateTag, unstable_cache } from "next/cache";
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

// ── ログイン中の定期読み直し用キャッシュ ─────────────────────────────
// auth() は画面を開くたびに jwt コールバックを通り、ログインから 5 分を過ぎると毎回メンバー情報を読み直す
// （サーバーコンポーネントからは更新後のトークンを Cookie に書き戻せないため、refreshedAt が進まない）。
// そのままだと 5 分経過後は全ページ表示で DB を 1 往復するので、メールアドレス単位でキャッシュする。
// 書き込み（下の upsert / password / active / delete）では必ず revalidateTag で即時に無効化する。
// DB を直接編集した場合のみ最大 5 分遅れる（従来の「5 分ごとに読み直し」と同じ許容幅）。
// パスワードハッシュは載せない。ログイン時の照合（authorize）とパスワード変更は findMemberRecord で毎回 DB を読む。
const MEMBER_TAG = "hub-member";
const cachedMemberRecord = unstable_cache(
  async (email: string): Promise<MemberRecord | null> => {
    const rec = await findMemberRecord(email);
    if (!rec) return null;
    const { passwordHash: _omit, ...rest } = rec;
    return rest;
  },
  ["hub-member-v1"],
  { revalidate: 300, tags: [MEMBER_TAG] },
);

export async function findMemberRecordCached(email: string): Promise<MemberRecord | undefined> {
  if (!hubDbConfigured()) return undefined;
  return (await cachedMemberRecord(email.toLowerCase())) ?? undefined;
}

function invalidateMembers(): void {
  revalidateTag(MEMBER_TAG);
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
  invalidateMembers();
}

export async function setMemberPassword(email: string, passwordHash: string, mustChange: boolean, actor: string): Promise<void> {
  const s = await db();
  await s`UPDATE hub_member SET password_hash = ${passwordHash}, must_change_password = ${mustChange}, updated_at = now(), updated_by = ${actor} WHERE email = ${email.toLowerCase()}`;
  invalidateMembers();
}

export async function setMemberActive(email: string, active: boolean, actor: string): Promise<void> {
  const s = await db();
  await s`UPDATE hub_member SET active = ${active}, updated_at = now(), updated_by = ${actor} WHERE email = ${email.toLowerCase()}`;
  invalidateMembers();
}

/** メンバーを完全に削除する（退職等。履歴は残らない。一時停止なら setMemberActive を使う） */
export async function deleteMemberRecord(email: string): Promise<void> {
  const s = await db();
  await s`DELETE FROM hub_member WHERE email = ${email.toLowerCase()}`;
  invalidateMembers();
}
