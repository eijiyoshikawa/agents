#!/usr/bin/env node
// @ts-check
/**
 * DB_顧客管理（database_id: 1ac3fae434994991b465e375bef7d66c）に対し、
 * 「従業員数 11〜29名」（D超B未満・エリア不問）の企業の
 * 「見込み度合い」を "C" に設定する冪等スクリプト。
 *
 *   A = 30名以上（関西）  B = 30名以上（関西外）  → 30名以上は A/B が担当
 *   D = 10名以下          → 別スクリプトが担当
 *   C = その間の 11〜29名  ← 本スクリプト
 *
 * - 既に "C" のページはスキップ（途中停止しても再実行で続行可能）
 * - 範囲が 11〜29 なので 30名以上(A/B) と 10名以下(D) には一切触れない
 * - 更新したページIDは updated-log-rank-c.csv に追記
 * - DRY_RUN=1 のときは更新せず、該当件数と内訳のみ出力
 *
 * 注意: この範囲に既存の A/B（手動設定など）が混じっている場合、デフォルトでは "C" で
 *       上書きします。手動オーバーライドを残したい場合は KEEP_HIGHER=1 を付けると
 *       既に A/B のページをスキップします。
 *
 * 使い方:
 *   export NOTION_TOKEN="ntn_..."
 *   DRY_RUN=1 node set-rank-c.mjs   # 件数確認
 *   node set-rank-c.mjs             # 本実行
 */

import { Client, APIResponseError } from "@notionhq/client";
import { appendFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// ---- 設定 ----
const DATABASE_ID =
  process.env.DATABASE_ID || "1ac3fae434994991b465e375bef7d66c";
const PROSPECT_PROP = "見込み度合い"; // select: A / B / C / D
const TARGET_VALUE = "C";
const EMPLOYEE_PROP = "従業員数"; // number
const EMP_MIN = 11;
const EMP_MAX = 29;
const KEEP_HIGHER = process.env.KEEP_HIGHER === "1"; // 既存 A/B を保護
const PAGE_SIZE = 100;
const UPDATE_SLEEP_MS = 350;
const MAX_RETRIES = 6;
const DRY_RUN = process.env.DRY_RUN === "1";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOG_PATH = join(__dirname, "updated-log-rank-c.csv");

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
    { property: EMPLOYEE_PROP, number: { greater_than_or_equal_to: EMP_MIN } },
    { property: EMPLOYEE_PROP, number: { less_than_or_equal_to: EMP_MAX } },
  ],
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const NET_CODES = new Set([
  "ECONNRESET", "ETIMEDOUT", "ECONNREFUSED", "EAI_AGAIN",
  "EPIPE", "ENOTFOUND", "UND_ERR_SOCKET", "UND_ERR_CONNECT_TIMEOUT",
]);

/** ECONNRESET 等の一時的なネットワーク/接続エラーか判定する。 */
function isNetworkError(err) {
  if (!err) return false;
  const code = err.code || err?.cause?.code;
  if (code && NET_CODES.has(code)) return true;
  if (err.name === "RequestTimeoutError") return true;
  return /ECONNRESET|ETIMEDOUT|ECONNREFUSED|EAI_AGAIN|socket hang up|fetch failed|network/i.test(
    String(err.message || "")
  );
}

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
      if (isNetworkError(err) && !isLast) {
        const backoff = Math.min(2 ** attempt * 500, 16000);
        console.warn(`  [NET] ${label}: ${err.code || err.message}; ${backoff}ms 後に再試行`);
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
  console.log(`=== set-rank-c ${DRY_RUN ? "(DRY_RUN)" : "(本実行)"} ===`);
  console.log(`database_id: ${DATABASE_ID}`);
  console.log(`条件: ${EMPLOYEE_PROP} ${EMP_MIN}〜${EMP_MAX}（エリア不問） → "${TARGET_VALUE}"${KEEP_HIGHER ? " / 既存A・Bは保護" : ""}\n`);

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

    const keepHigher = KEEP_HIGHER && (current === "A" || current === "B");
    if (current === TARGET_VALUE || keepHigher) {
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
  console.log(`スキップ : ${skipped}${KEEP_HIGHER ? ' (既に"C" or A/B保護)' : ' (既に"C")'}`);
  console.log(`失敗件数 : ${failed}`);
  if (!DRY_RUN) console.log(`ログ     : ${LOG_PATH}`);
}

main().catch((err) => {
  console.error("FATAL:", err instanceof Error ? err.message : err);
  process.exit(1);
});
