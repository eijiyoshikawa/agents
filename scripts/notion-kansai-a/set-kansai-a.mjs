#!/usr/bin/env node
// @ts-check
/**
 * DB_顧客管理（database_id: 1ac3fae434994991b465e375bef7d66c）に対し、
 * 「関西（大阪/京都/兵庫）かつ従業員数 >= 30」の企業の
 * （滋賀県は B 扱いのため関西に含めない。初回は4府県で実行済みだが、滋賀30名以上は run:b で B に移る）
 * 「見込み度合い」を一括で "A" に設定する冪等スクリプト。
 *
 * - 既に "A" のページはスキップ（途中停止しても再実行で続きから処理可能）
 * - 更新したページIDは updated-log.csv に追記
 * - DRY_RUN=1 のときは更新せず、該当件数と内訳のみ出力
 *
 * 使い方:
 *   export NOTION_TOKEN="ntn_..."
 *   DRY_RUN=1 node set-kansai-a.mjs   # 件数確認
 *   node set-kansai-a.mjs             # 本実行
 */

import { Client, APIResponseError } from "@notionhq/client";
import { appendFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// ---- 設定 ----
const DATABASE_ID =
  process.env.DATABASE_ID || "1ac3fae434994991b465e375bef7d66c";
const PROSPECT_PROP = "見込み度合い"; // select: A / B / C / D
const TARGET_VALUE = "A";
const EMPLOYEE_PROP = "従業員数"; // number
const ADDRESS_PROP = "住所"; // rich_text
const KANSAI = ["大阪府", "京都府", "兵庫県"]; // 滋賀県は含めない（B 扱い）
const EXCLUDE = "東京都"; // 東京都府中市の "京都府" 部分一致を除外
const PAGE_SIZE = 100;
const UPDATE_SLEEP_MS = 350; // 更新間スリープ（レート制御）
const MAX_RETRIES = 6; // 429 / 5xx 用
const DRY_RUN = process.env.DRY_RUN === "1";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOG_PATH = join(__dirname, "updated-log.csv");

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
    { property: ADDRESS_PROP, rich_text: { does_not_contain: EXCLUDE } },
    {
      or: KANSAI.map((kw) => ({
        property: ADDRESS_PROP,
        rich_text: { contains: kw },
      })),
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
  console.log(`=== set-kansai-a ${DRY_RUN ? "(DRY_RUN)" : "(本実行)"} ===`);
  console.log(`database_id: ${DATABASE_ID}`);
  console.log(`条件: ${EMPLOYEE_PROP} >= 30 / ${ADDRESS_PROP} に ${KANSAI.join("・")} を含み ${EXCLUDE} を含まない\n`);

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
