#!/usr/bin/env node
// @ts-check
/**
 * DB_顧客管理（database_id: 1ac3fae434994991b465e375bef7d66c）に対し、
 * 「関西以外 × 従業員数30名以上」の企業の「見込み度合い」を "B" に設定する冪等スクリプト。
 *
 * 「関西以外」の定義は A 設定（set-kansai-a.mjs）の裏返し。
 *   A = 30名以上 AND 住所に関西4府県を含む AND 東京都を含まない
 *   B = 30名以上 AND NOT(A のエリア条件)
 *     = 30名以上 AND ( 東京都を含む OR 関西4府県をいずれも含まない )
 * これにより「東京都府中市」が "京都府" に部分一致して関西扱いされる事故を防ぎつつ、
 * 東京都府中市の企業は正しく B（関西外）に入る。
 *
 * - 既に "B" のページはスキップ（途中停止しても再実行で続行可能）
 * - A 済みの関西30名以上は B のフィルタに一致しないため上書きしない
 * - 更新したページIDは updated-log-rank-b.csv に追記
 * - DRY_RUN=1 のときは更新せず、該当件数と内訳のみ出力
 *
 * 使い方:
 *   export NOTION_TOKEN="ntn_..."
 *   DRY_RUN=1 node set-rank-b.mjs   # 件数確認
 *   node set-rank-b.mjs             # 本実行
 */

import { Client, APIResponseError } from "@notionhq/client";
import { appendFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// ---- 設定 ----
const DATABASE_ID =
  process.env.DATABASE_ID || "1ac3fae434994991b465e375bef7d66c";
const PROSPECT_PROP = "見込み度合い"; // select: A / B / C / D
const TARGET_VALUE = "B";
const EMPLOYEE_PROP = "従業員数"; // number
const ADDRESS_PROP = "住所"; // rich_text
// A 設定と完全に同じ関西4府県（滋賀県を含む）。ここを変えると A/B の境界が変わる。
const KANSAI = ["大阪府", "京都府", "兵庫県", "滋賀県"];
const TOKYO = "東京都";
const PAGE_SIZE = 100;
const UPDATE_SLEEP_MS = 350;
const MAX_RETRIES = 6;
const DRY_RUN = process.env.DRY_RUN === "1";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOG_PATH = join(__dirname, "updated-log-rank-b.csv");

if (!process.env.NOTION_TOKEN) {
  console.error("ERROR: 環境変数 NOTION_TOKEN が未設定です。");
  console.error('  export NOTION_TOKEN="ntn_..." をセットしてください。');
  process.exit(1);
}

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
  notionVersion: "2022-06-28",
});

const filter = {
  and: [
    { property: EMPLOYEE_PROP, number: { greater_than_or_equal_to: 30 } },
    {
      or: [
        // 東京都府中市など「東京都」を含む住所は関西外なので B 対象
        { property: ADDRESS_PROP, rich_text: { contains: TOKYO } },
        // 関西4府県をいずれも含まない＝関西外
        {
          and: KANSAI.map((kw) => ({
            property: ADDRESS_PROP,
            rich_text: { does_not_contain: kw },
          })),
        },
      ],
    },
  ],
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Notion API 呼び出しを 429（Retry-After 準拠）/ 5xx（指数バックオフ）でリトライする。
 * @template T
 * @param {() => Promise<T>} fn
 * @param {string} label
 * @returns {Promise<T>}
 */
async function withRetry(fn, label) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isLast = attempt === MAX_RETRIES;
      if (err instanceof APIResponseError && err.status === 429) {
        const retryAfter = Number(err.headers?.["retry-after"]) || 1;
        if (isLast) throw err;
        console.warn(`  [429] ${label}: ${retryAfter}s 待機して再試行`);
        await sleep(retryAfter * 1000);
        continue;
      }
      const status = err instanceof APIResponseError ? err.status : 0;
      if (status >= 500 && status < 600 && !isLast) {
        const backoff = Math.min(2 ** attempt * 500, 16000);
        console.warn(`  [${status}] ${label}: ${backoff}ms 後に再試行`);
        await sleep(backoff);
        continue;
      }
      throw err;
    }
  }
  throw new Error(`unreachable: ${label}`);
}

/** ページの現在の「見込み度合い」値を返す（未設定は null）。 */
function getProspect(page) {
  const prop = page.properties?.[PROSPECT_PROP];
  return prop?.select?.name ?? null;
}

/** 条件一致ページを全件取得（ページネーション）。 */
async function* iterateMatches() {
  let cursor = undefined;
  do {
    const res = await withRetry(
      () =>
        notion.databases.query({
          database_id: DATABASE_ID,
          filter,
          page_size: PAGE_SIZE,
          start_cursor: cursor,
        }),
      "databases.query"
    );
    for (const page of res.results) yield page;
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
}

async function main() {
  console.log(`=== set-rank-b ${DRY_RUN ? "(DRY_RUN)" : "(本実行)"} ===`);
  console.log(`database_id: ${DATABASE_ID}`);
  console.log(`条件: ${EMPLOYEE_PROP} >= 30 / 関西以外（${KANSAI.join("・")}を含まない or 東京都を含む） → "${TARGET_VALUE}"\n`);

  let matched = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;
  /** @type {Record<string, number>} 更新前の値の内訳 */
  const breakdown = {};

  for await (const page of iterateMatches()) {
    matched++;
    const current = getProspect(page);
    const key = current ?? "(未設定)";
    breakdown[key] = (breakdown[key] || 0) + 1;

    if (current === TARGET_VALUE) {
      skipped++;
      continue;
    }
    if (DRY_RUN) continue;

    try {
      await withRetry(
        () =>
          notion.pages.update({
            page_id: page.id,
            properties: { [PROSPECT_PROP]: { select: { name: TARGET_VALUE } } },
          }),
        `pages.update ${page.id}`
      );
      updated++;
      await appendFile(
        LOG_PATH,
        `${new Date().toISOString()},${page.id},${key}->${TARGET_VALUE}\n`
      );
      if (updated % 50 === 0) console.log(`  ...更新 ${updated} 件完了`);
      await sleep(UPDATE_SLEEP_MS);
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  [FAIL] ${page.id}: ${msg}`);
    }
  }

  console.log("\n--- 更新前 見込み度合い 内訳 ---");
  for (const [k, v] of Object.entries(breakdown).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k}: ${v}`);
  }
  console.log("\n=== 集計 ===");
  console.log(`該当件数 : ${matched}`);
  console.log(`更新件数 : ${DRY_RUN ? `0 (DRY_RUN / 更新対象 ${matched - skipped} 件)` : updated}`);
  console.log(`スキップ : ${skipped} (既に "${TARGET_VALUE}")`);
  console.log(`失敗件数 : ${failed}`);
  if (!DRY_RUN) console.log(`ログ     : ${LOG_PATH}`);
}

main().catch((err) => {
  console.error("FATAL:", err instanceof Error ? err.message : err);
  process.exit(1);
});
