/**
 * 自動マイグレーション: DB を初めて使うときに db/*.sql（schema-sql.ts に埋め込み）を適用する。
 * 適用済みは hub_migration で管理し、同時実行は advisory lock で直列化する。`npm run hub:migrate` と同じ結果になる。
 */
import { hubDbConfigured, sql } from "./db";
import { HUB_SCHEMA } from "./schema-sql";

const LOCK_KEY = 7340_0002;
let ready: Promise<void> | undefined;

export function ensureHubSchema(): Promise<void> {
  if (!hubDbConfigured()) return Promise.resolve();
  if (!ready) {
    ready = run().catch((e) => {
      ready = undefined;
      throw e;
    });
  }
  return ready;
}

/** 適用済みの名前。管理表がまだ無い（初回）ときは null */
async function appliedNames(db: ReturnType<typeof sql>): Promise<Set<string> | null> {
  try {
    return new Set((await db`SELECT name FROM hub_migration`).map((r) => String(r.name)));
  } catch (e) {
    if ((e as { code?: string }).code === "42P01") return null; // undefined_table
    throw e;
  }
}

async function run(): Promise<void> {
  const db = sql();
  // 通常（適用済み）はこの SELECT 1 往復で終わる。管理表が無い初回だけ作成する（起動直後の DB 往復を 1 回減らす）
  let found = await appliedNames(db);
  if (!found) {
    await db`CREATE TABLE IF NOT EXISTS hub_migration (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`;
    found = new Set();
  }
  const applied = found;
  const pending = HUB_SCHEMA.filter((m) => !applied.has(m.name));
  if (pending.length === 0) return;
  await db.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(${LOCK_KEY})`;
    const now = new Set((await tx`SELECT name FROM hub_migration`).map((r) => String(r.name)));
    for (const m of pending) {
      if (now.has(m.name)) continue;
      await tx.unsafe(m.sql);
      await tx`INSERT INTO hub_migration (name) VALUES (${m.name})`;
    }
  });
}
