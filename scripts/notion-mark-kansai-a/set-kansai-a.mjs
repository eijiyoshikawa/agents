import { Client } from "@notionhq/client";
import fs from "node:fs";

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DATABASE_ID = "1ac3fae4-3499-4991-b465-e375bef7d66c";
const DRY_RUN = process.env.DRY_RUN === "1";
const SLEEP_MS = Number(process.env.SLEEP_MS || 350);
const LOG_PATH = "updated-log.csv";

if (!NOTION_TOKEN) {
  console.error("error: NOTION_TOKEN env var is required");
  console.error("       export NOTION_TOKEN=ntn_...");
  process.exit(1);
}

const notion = new Client({
  auth: NOTION_TOKEN,
  notionVersion: "2022-06-28",
});

const FILTER = {
  and: [
    { property: "従業員数", number: { greater_than_or_equal_to: 30 } },
    { property: "住所", rich_text: { does_not_contain: "東京都" } },
    {
      or: [
        { property: "住所", rich_text: { contains: "大阪府" } },
        { property: "住所", rich_text: { contains: "京都府" } },
        { property: "住所", rich_text: { contains: "兵庫県" } },
        { property: "住所", rich_text: { contains: "滋賀県" } },
      ],
    },
  ],
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function withRetry(fn, attempt = 0) {
  try {
    return await fn();
  } catch (err) {
    const status = err.status ?? err.code;
    if (status === 429 || status === "rate_limited") {
      const retryAfter = Number(err.headers?.["retry-after"] ?? 1);
      console.warn(`[429] rate limited. retry after ${retryAfter}s`);
      await sleep(retryAfter * 1000);
      return withRetry(fn, attempt + 1);
    }
    if (typeof status === "number" && status >= 500 && attempt < 5) {
      const wait = Math.min(2 ** attempt * 1000, 30_000);
      console.warn(`[${status}] backoff ${wait}ms (attempt ${attempt + 1})`);
      await sleep(wait);
      return withRetry(fn, attempt + 1);
    }
    throw err;
  }
}

async function* fetchAll() {
  let cursor = undefined;
  while (true) {
    const res = await withRetry(() =>
      notion.databases.query({
        database_id: DATABASE_ID,
        filter: FILTER,
        page_size: 100,
        start_cursor: cursor,
      }),
    );
    for (const page of res.results) yield page;
    if (!res.has_more) break;
    cursor = res.next_cursor;
  }
}

function getTitle(page) {
  const title = page.properties?.["顧客名"]?.title;
  if (!title || title.length === 0) return "";
  return title.map((t) => t.plain_text).join("");
}

function getRank(page) {
  return page.properties?.["見込み度合い"]?.select?.name ?? null;
}

function getAddress(page) {
  const arr = page.properties?.["住所"]?.rich_text;
  if (!arr || arr.length === 0) return "";
  return arr.map((t) => t.plain_text).join("");
}

function getEmployeeCount(page) {
  return page.properties?.["従業員数"]?.number ?? null;
}

async function main() {
  console.log(`mode:        ${DRY_RUN ? "DRY_RUN" : "APPLY"}`);
  console.log(`database_id: ${DATABASE_ID}`);
  console.log(`sleep_ms:    ${SLEEP_MS}`);
  console.log("");

  let total = 0;
  let alreadyA = 0;
  let toUpdate = 0;
  let updated = 0;
  let failed = 0;
  const rankBreakdown = {};

  const csv =
    !DRY_RUN ? fs.createWriteStream(LOG_PATH, { flags: "a" }) : null;
  if (csv) {
    csv.write(`# run started at ${new Date().toISOString()}\n`);
    csv.write(`page_id,title,prev_rank,employee_count\n`);
  }

  for await (const page of fetchAll()) {
    total++;
    const rank = getRank(page);
    const rankKey = rank ?? "(empty)";
    rankBreakdown[rankKey] = (rankBreakdown[rankKey] ?? 0) + 1;

    if (rank === "A") {
      alreadyA++;
      continue;
    }
    toUpdate++;

    if (DRY_RUN) {
      if (toUpdate <= 5) {
        console.log(
          `[sample] ${getTitle(page)} | rank=${rankKey} | emp=${getEmployeeCount(page)} | ${getAddress(page).slice(0, 40)}`,
        );
      }
      continue;
    }

    try {
      await withRetry(() =>
        notion.pages.update({
          page_id: page.id,
          properties: {
            "見込み度合い": { select: { name: "A" } },
          },
        }),
      );
      updated++;
      const title = getTitle(page).replace(/[",\n]/g, " ");
      csv.write(`${page.id},"${title}",${rank ?? ""},${getEmployeeCount(page) ?? ""}\n`);
      if (updated % 50 === 0) {
        console.log(`[progress] updated=${updated}/${toUpdate}`);
      }
      await sleep(SLEEP_MS);
    } catch (err) {
      failed++;
      console.error(
        `[fail] ${page.id} | ${getTitle(page)} | ${err.message}`,
      );
      await sleep(SLEEP_MS);
    }
  }

  if (csv) csv.end();

  console.log("");
  console.log("=== summary ===");
  console.log(`total matched: ${total}`);
  console.log(`already A:     ${alreadyA}`);
  console.log(`to update:     ${toUpdate}`);
  console.log(`updated:       ${updated}`);
  console.log(`failed:        ${failed}`);
  console.log("");
  console.log("rank breakdown (before update):");
  for (const [k, v] of Object.entries(rankBreakdown).sort()) {
    console.log(`  ${k}: ${v}`);
  }
  if (DRY_RUN) {
    console.log("");
    console.log("[dry-run] no changes were made. run without DRY_RUN=1 to apply.");
  } else {
    console.log("");
    console.log(`log written → ${LOG_PATH}`);
  }
}

main().catch((e) => {
  console.error("[fatal]", e);
  process.exit(1);
});
