#!/usr/bin/env node
// @ts-check
/**
 * 架電ログDBから「指定日（既定: 本日 JST）」の架電数を集計する読み取り専用スクリプト。
 *   - 総架電数 / 担当者別 / 結果別 を表示
 *   - SLACK_WEBHOOK_URL を設定すると Slack にも投稿
 *
 * 前提: 別途「架電ログ」DB（1架電=1レコード）を作成し、その database_id を CALL_LOG_DB_ID に設定。
 *       日付の基準は既定で Date プロパティ「架電日時」。作成日時で数えたい場合は DATE_FIELD=created_time。
 *
 * 使い方:
 *   export NOTION_TOKEN="ntn_..."
 *   export CALL_LOG_DB_ID="（架電ログDBのID）"
 *   node call-report.mjs                 # 本日(JST)
 *   DATE=2026-06-02 node call-report.mjs # 指定日
 *   DATE_FIELD=created_time node call-report.mjs
 */

import { Client, APIResponseError } from "@notionhq/client";

const CALL_LOG_DB_ID = process.env.CALL_LOG_DB_ID;
const DATE_PROP = process.env.DATE_PROP || "架電日時"; // Date プロパティ名
const DATE_FIELD = process.env.DATE_FIELD || "property"; // "property" | "created_time"
const ASSIGNEE_PROP = process.env.ASSIGNEE_PROP || "担当者";
const RESULT_PROP = process.env.RESULT_PROP || "結果";
const PAGE_SIZE = 100;
const MAX_RETRIES = 6;

if (!process.env.NOTION_TOKEN) {
  console.error('ERROR: NOTION_TOKEN 未設定。export NOTION_TOKEN="ntn_..." してください。');
  process.exit(1);
}
if (!CALL_LOG_DB_ID) {
  console.error('ERROR: CALL_LOG_DB_ID 未設定。架電ログDBのIDをセットしてください。');
  console.error('  export CALL_LOG_DB_ID="..."');
  process.exit(1);
}

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
  notionVersion: "2022-06-28",
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 指定日（JST）の [開始ISO, 翌日開始ISO] を返す。dateStr 未指定なら本日(JST)。 */
function jstDayRange(dateStr) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" }).format(new Date());
  const date = dateStr || today; // YYYY-MM-DD
  const [y, m, d] = date.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
  return { date, startISO: `${date}T00:00:00.000+09:00`, endISO: `${next}T00:00:00.000+09:00` };
}

function buildFilter(startISO, endISO) {
  if (DATE_FIELD === "created_time") {
    return {
      and: [
        { timestamp: "created_time", created_time: { on_or_after: startISO } },
        { timestamp: "created_time", created_time: { before: endISO } },
      ],
    };
  }
  return {
    and: [
      { property: DATE_PROP, date: { on_or_after: startISO } },
      { property: DATE_PROP, date: { before: endISO } },
    ],
  };
}

/** プロパティから表示用ラベルを取り出す（people / select / multi_select / text / created_by 対応）。 */
function labelOf(prop) {
  if (!prop) return "(未設定)";
  switch (prop.type) {
    case "people": return prop.people.map((p) => p.name || p.id).join(", ") || "(未設定)";
    case "select": return prop.select?.name ?? "(未設定)";
    case "multi_select": return prop.multi_select.map((s) => s.name).join(", ") || "(未設定)";
    case "rich_text": return prop.rich_text.map((t) => t.plain_text).join("") || "(未設定)";
    case "title": return prop.title.map((t) => t.plain_text).join("") || "(未設定)";
    case "created_by": return prop.created_by?.name ?? "(未設定)";
    default: return "(未設定)";
  }
}

async function withRetry(fn, label) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isLast = attempt === MAX_RETRIES;
      if (err instanceof APIResponseError && err.status === 429) {
        if (isLast) throw err;
        await sleep((Number(err.headers?.["retry-after"]) || 1) * 1000);
        continue;
      }
      const status = err instanceof APIResponseError ? err.status : 0;
      const netty = /ECONNRESET|ETIMEDOUT|fetch failed|socket hang up/i.test(String(err?.message));
      if ((status >= 500 || netty) && !isLast) {
        await sleep(Math.min(2 ** attempt * 500, 16000));
        continue;
      }
      throw err;
    }
  }
  throw new Error(`unreachable: ${label}`);
}

/** 指定フィルタの全ページを走査。 */
async function* iterate(filter) {
  let cursor = undefined;
  do {
    const res = await withRetry(
      () =>
        notion.databases.query({
          database_id: CALL_LOG_DB_ID,
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

function tally(map, key) {
  map.set(key, (map.get(key) || 0) + 1);
}

function sortedEntries(map) {
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

async function main() {
  const { date, startISO, endISO } = jstDayRange(process.env.DATE);
  let total = 0;
  const byAssignee = new Map();
  const byResult = new Map();

  for await (const page of iterate(buildFilter(startISO, endISO))) {
    total++;
    tally(byAssignee, labelOf(page.properties?.[ASSIGNEE_PROP]));
    tally(byResult, labelOf(page.properties?.[RESULT_PROP]));
  }

  const lines = [];
  lines.push(`📞 架電レポート ${date}（JST）`);
  lines.push(`総架電数: ${total} 件`);
  lines.push("— 担当者別 —");
  for (const [k, v] of sortedEntries(byAssignee)) lines.push(`  ${k}: ${v}`);
  lines.push("— 結果別 —");
  for (const [k, v] of sortedEntries(byResult)) lines.push(`  ${k}: ${v}`);

  const report = lines.join("\n");
  console.log(report);

  if (process.env.SLACK_WEBHOOK_URL) {
    try {
      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: report }),
      });
      console.log("\n(Slack に投稿しました)");
    } catch (err) {
      console.error("Slack投稿に失敗:", err instanceof Error ? err.message : err);
    }
  }
}

main().catch((err) => {
  console.error("FATAL:", err instanceof Error ? err.message : err);
  process.exit(1);
});
