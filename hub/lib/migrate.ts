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

async function run(): Promise<void> {
  const db = sql();
  await db`CREATE TABLE IF NOT EXISTS hub_migration (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`;
  const applied = new Set((await db`SELECT name FROM hub_migration`).map((r) => String(r.name)));
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
