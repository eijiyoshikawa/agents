#!/usr/bin/env node
// db/*.sql を lib/schema-sql.ts に埋め込む（本番で初回アクセス時に自動マイグレーションするため）
//   node scripts/hub-sync-schema.mjs
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), "db");
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
const entries = files.map((f) => ({ name: f, sql: readFileSync(join(dir, f), "utf8") }));
const out = `// 自動生成: node scripts/hub-sync-schema.mjs（編集は db/*.sql に行い、このスクリプトで再生成する）
export const HUB_SCHEMA: { name: string; sql: string }[] = ${JSON.stringify(entries, null, 2)};
`;
writeFileSync(join(process.cwd(), "lib", "schema-sql.ts"), out);
console.log(`wrote lib/schema-sql.ts (${files.join(", ")})`);
