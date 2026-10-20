import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { HUB_SCHEMA } from "@/lib/schema-sql";

describe("自動マイグレーション", () => {
  it("schema-sql.ts は db/*.sql と一致している（node scripts/hub-sync-schema.mjs で再生成）", () => {
    const dir = join(process.cwd(), "db");
    const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
    expect(HUB_SCHEMA.map((m) => m.name)).toEqual(files);
    for (const m of HUB_SCHEMA) expect(m.sql).toBe(readFileSync(join(dir, m.name), "utf8"));
  });
});
