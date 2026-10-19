#!/usr/bin/env node
// ハブのメンバー保存先の初期化: db/*.sql を名前順に適用（適用済みは hub_migration で管理）
//   HUB_DATABASE_URL=postgres://... node scripts/hub-migrate.mjs
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

const url = process.env.HUB_DATABASE_URL || process.env.DATABASE_URL;
if (!url) {
  console.error("HUB_DATABASE_URL（または DATABASE_URL）を設定してください");
  process.exit(1);
}
const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {}, ssl: /localhost|127\.0\.0\.1/.test(url) ? undefined : "require" });
const dir = join(process.cwd(), "db");
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
try {
  await sql`CREATE TABLE IF NOT EXISTS hub_migration (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`;
  const applied = new Set((await sql`SELECT name FROM hub_migration`).map((r) => r.name));
  for (const f of files) {
    if (applied.has(f)) {
      console.log(`skip  ${f}`);
      continue;
    }
    await sql.begin(async (tx) => {
      await tx.unsafe(readFileSync(join(dir, f), "utf8"));
      await tx`INSERT INTO hub_migration (name) VALUES (${f})`;
    });
    console.log(`apply ${f}`);
  }
  console.log("done");
} finally {
  await sql.end();
}
