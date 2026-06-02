#!/usr/bin/env node
// @ts-check
/**
 * 診断専用（読み取りのみ・更新しない）。
 * DB_顧客管理の「従業員数」分布を1パスで集計し、なぜ <=10 が少ない/0件なのかを切り分ける。
 *
 * 使い方:
 *   export NOTION_TOKEN="ntn_..."
 *   node diag-employees.mjs
 */

import { Client, APIResponseError } from "@notionhq/client";

const DATABASE_ID =
  process.env.DATABASE_ID || "1ac3fae434994991b465e375bef7d66c";
const EMPLOYEE_PROP = "従業員数";
const PAGE_SIZE = 100;
const MAX_RETRIES = 6;

if (!process.env.NOTION_TOKEN) {
  console.error("ERROR: 環境変数 NOTION_TOKEN が未設定です。");
  process.exit(1);
}

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
  notionVersion: "2022-06-28",
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function withRetry(fn, label) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isLast = attempt === MAX_RETRIES;
      if (err instanceof APIResponseError && err.status === 429) {
        const retryAfter = Number(err.headers?.["retry-after"]) || 1;
        if (isLast) throw err;
        await sleep(retryAfter * 1000);
        continue;
      }
      const status = err instanceof APIResponseError ? err.status : 0;
      if (status >= 500 && status < 600 && !isLast) {
        await sleep(Math.min(2 ** attempt * 500, 16000));
        continue;
      }
      throw err;
    }
  }
  throw new Error(`unreachable: ${label}`);
}

/** 「従業員数」が空でない行を全件走査。 */
async function* iteratePopulated() {
  let cursor = undefined;
  do {
    const res = await withRetry(
      () =>
        notion.databases.query({
          database_id: DATABASE_ID,
          filter: { property: EMPLOYEE_PROP, number: { is_not_empty: true } },
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
  console.log(`=== 従業員数 分布診断（読み取りのみ）===`);
  console.log(`database_id: ${DATABASE_ID}\n`);

  const buckets = { "0": 0, "1-10": 0, "11-29": 0, "30+": 0 };
  let populated = 0;
  let min = Infinity;
  let max = -Infinity;

  for await (const page of iteratePopulated()) {
    const v = page.properties?.[EMPLOYEE_PROP]?.number;
    if (typeof v !== "number") continue;
    populated++;
    min = Math.min(min, v);
    max = Math.max(max, v);
    if (v === 0) buckets["0"]++;
    else if (v <= 10) buckets["1-10"]++;
    else if (v <= 29) buckets["11-29"]++;
    else buckets["30+"]++;
  }

  console.log(`従業員数が入力済みの行: ${populated} 件`);
  console.log(`  最小: ${populated ? min : "-"} / 最大: ${populated ? max : "-"}\n`);
  console.log("--- 人数レンジ別 ---");
  for (const [k, n] of Object.entries(buckets)) console.log(`  ${k} 名: ${n}`);
  console.log(`\n(※空欄の行は number フィルタ対象外のため、上記には含まれません)`);
}

main().catch((err) => {
  console.error("FATAL:", err instanceof Error ? err.message : err);
  process.exit(1);
});
