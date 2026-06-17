// 従業員数=空欄 & 業種=建設 & 見込み度合い=空欄 のページに B を一律付与
// (gBizINFOで補完不可だった社のフォールバック)

import { Client } from "@notionhq/client";

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DATABASE_ID = "1ac3fae4-3499-4991-b465-e375bef7d66c";
const DRY_RUN = process.env.DRY_RUN === "1";
const SLEEP_MS = Number(process.env.SLEEP_MS || 350);

if (!NOTION_TOKEN) {
  console.error("error: NOTION_TOKEN required");
  process.exit(1);
}

const notion = new Client({ auth: NOTION_TOKEN, notionVersion: "2022-06-28" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const FILTER = {
  and: [
    { property: "従業員数", number: { is_empty: true } },
    { property: "業種", select: { equals: "建設" } },
    { property: "見込み度合い", select: { is_empty: true } },
  ],
};

async function withRetry(fn, attempt = 0) {
  try {
    return await fn();
  } catch (err) {
    if (err.status === 429 && attempt < 5) {
      await sleep((err.headers?.["retry-after"] ?? 1) * 1000);
      return withRetry(fn, attempt + 1);
    }
    if (err.status >= 500 && attempt < 5) {
      await sleep(Math.min(2 ** attempt * 1000, 30_000));
      return withRetry(fn, attempt + 1);
    }
    throw err;
  }
}

async function* fetchAll() {
  let cursor;
  while (true) {
    const res = await withRetry(() =>
      notion.databases.query({
        database_id: DATABASE_ID,
        filter: FILTER,
        page_size: 100,
        start_cursor: cursor,
      }),
    );
    for (const p of res.results) yield p;
    if (!res.has_more) break;
    cursor = res.next_cursor;
  }
}

const getTitle = (p) =>
  (p.properties?.["顧客名"]?.title ?? []).map((t) => t.plain_text).join("");
const getAddress = (p) =>
  (p.properties?.["住所"]?.rich_text ?? []).map((t) => t.plain_text).join("");

async function main() {
  console.log(`mode: ${DRY_RUN ? "DRY_RUN" : "APPLY"}`);
  let total = 0, updated = 0, failed = 0;
  for await (const page of fetchAll()) {
    total++;
    const title = getTitle(page);
    const addr = getAddress(page).slice(0, 50);
    console.log(`[${total}] ${title} | ${addr}`);
    if (DRY_RUN) continue;
    try {
      await withRetry(() =>
        notion.pages.update({
          page_id: page.id,
          properties: { "見込み度合い": { select: { name: "B" } } },
        }),
      );
      updated++;
      await sleep(SLEEP_MS);
    } catch (e) {
      failed++;
      console.error(`  [fail] ${e.message}`);
    }
  }
  console.log("");
  console.log(`total: ${total}`);
  console.log(`updated: ${updated}`);
  console.log(`failed: ${failed}`);
}

main().catch((e) => {
  console.error("[fatal]", e);
  process.exit(1);
});
