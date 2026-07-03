import { sql } from "@vercel/postgres";
import { JobPostingSchema, type JobPosting } from "./types";

/** サーバー保存の履歴エントリ。 */
export interface StoredEntry {
  id: string;
  savedAt: number;
  title: string;
  job: JobPosting;
}

/** Vercel Postgres が接続設定されているか。 */
export function isDbConfigured(): boolean {
  return Boolean(
    process.env.POSTGRES_URL ||
      process.env.POSTGRES_PRISMA_URL ||
      process.env.DATABASE_URL,
  );
}

let ensured = false;
/** テーブルが無ければ作成する（初回のみ）。 */
async function ensureTable(): Promise<void> {
  if (ensured) return;
  await sql`
    CREATE TABLE IF NOT EXISTS job_history (
      id text PRIMARY KEY,
      saved_at bigint NOT NULL,
      title text NOT NULL,
      job jsonb NOT NULL
    )
  `;
  ensured = true;
}

/** 全件を新しい順で取得。 */
export async function listEntries(): Promise<StoredEntry[]> {
  await ensureTable();
  const { rows } = await sql`
    SELECT id, saved_at, title, job FROM job_history ORDER BY saved_at DESC
  `;
  return rows.map((r) => ({
    id: r.id as string,
    savedAt: Number(r.saved_at),
    title: r.title as string,
    job: JobPostingSchema.parse(r.job),
  }));
}

/** 1件を保存（upsert）。 */
export async function upsertEntry(entry: StoredEntry): Promise<void> {
  await ensureTable();
  const jobJson = JSON.stringify(JobPostingSchema.parse(entry.job));
  await sql`
    INSERT INTO job_history (id, saved_at, title, job)
    VALUES (${entry.id}, ${entry.savedAt}, ${entry.title}, ${jobJson}::jsonb)
    ON CONFLICT (id) DO UPDATE
      SET saved_at = EXCLUDED.saved_at,
          title = EXCLUDED.title,
          job = EXCLUDED.job
  `;
}

/** 複数IDを削除。 */
export async function deleteEntriesByIds(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await ensureTable();
  // パラメータ配列で安全に削除
  await sql.query(
    `DELETE FROM job_history WHERE id = ANY($1::text[])`,
    [ids],
  );
}
