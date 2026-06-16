import { Client } from "@notionhq/client";
import fs from "node:fs";

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DATABASE_ID = "1ac3fae4-3499-4991-b465-e375bef7d66c";
const DRY_RUN = process.env.DRY_RUN === "1";
const FORCE = process.env.FORCE === "1";
const SLEEP_MS = Number(process.env.SLEEP_MS || 350);
const LOG_PATH = "rank-update-log.csv";

if (!NOTION_TOKEN) {
  console.error("error: NOTION_TOKEN env var is required");
  console.error("       export NOTION_TOKEN=ntn_...");
  process.exit(1);
}

const notion = new Client({
  auth: NOTION_TOKEN,
  notionVersion: "2022-06-28",
});

const KANSAI_RE = /(大阪府|京都府|兵庫県|滋賀県)/;
const KANTO_RE = /(東京都|神奈川県|千葉県|埼玉県)/;
const CONSTRUCTION_INDUSTRY = "建設";

function computeRank(employees, address, industry) {
  if (employees == null) return null;
  if (employees >= 30) {
    const inKantoKansai = KANTO_RE.test(address) || KANSAI_RE.test(address);
    const isConstruction = industry === CONSTRUCTION_INDUSTRY;
    if (inKantoKansai && isConstruction) return "A";
    return "B";
  }
  if (employees >= 10) return "C";
  return "D";
}

const FILTER = {
  property: "従業員数",
  number: { is_not_empty: true },
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

function getIndustry(page) {
  return page.properties?.["業種"]?.select?.name ?? null;
}

async function main() {
  console.log(`mode:        ${DRY_RUN ? "DRY_RUN" : (FORCE ? "APPLY (FORCE overwrite)" : "APPLY (fill empty only)")}`);
  console.log(`database_id: ${DATABASE_ID}`);
  console.log(`sleep_ms:    ${SLEEP_MS}`);
  console.log("");

  let total = 0;
  let matched = 0;       // 計算結果と既存ランク一致
  let mismatched = 0;    // 計算結果と既存ランク不一致(FORCE時のみ更新)
  let noAddress = 0;     // 住所無しで判定不能(B扱い)
  let toUpdate = 0;
  let updated = 0;
  let failed = 0;
  const fromBreakdown = {};  // 既存ランク分布
  const toBreakdown = {};    // 計算後ランク分布
  const transitionBreakdown = {}; // 遷移パターン

  const csv =
    !DRY_RUN ? fs.createWriteStream(LOG_PATH, { flags: "a" }) : null;
  if (csv) {
    csv.write(`# run started at ${new Date().toISOString()}\n`);
    csv.write(`page_id,title,prev_rank,new_rank,employee_count,address\n`);
  }

  for await (const page of fetchAll()) {
    total++;
    const employees = getEmployeeCount(page);
    const address = getAddress(page);
    const industry = getIndustry(page);
    const currentRank = getRank(page);
    const expectedRank = computeRank(employees, address, industry);

    if (expectedRank == null) continue;
    if (employees >= 30 && !address) noAddress++;

    const fromKey = currentRank ?? "(empty)";
    fromBreakdown[fromKey] = (fromBreakdown[fromKey] ?? 0) + 1;
    toBreakdown[expectedRank] = (toBreakdown[expectedRank] ?? 0) + 1;
    const transKey = `${fromKey} → ${expectedRank}`;
    transitionBreakdown[transKey] = (transitionBreakdown[transKey] ?? 0) + 1;

    if (currentRank === expectedRank) {
      matched++;
      continue;
    }

    // 既存ランクあり & FORCE 無し → スキップ(報告のみ)
    if (currentRank != null && !FORCE) {
      mismatched++;
      continue;
    }

    toUpdate++;

    if (DRY_RUN) {
      if (toUpdate <= 10) {
        console.log(
          `[sample] ${getTitle(page)} | ${fromKey} → ${expectedRank} | emp=${employees} | 業種=${industry ?? "(empty)"} | ${address.slice(0, 40)}`,
        );
      }
      continue;
    }

    try {
      await withRetry(() =>
        notion.pages.update({
          page_id: page.id,
          properties: {
            "見込み度合い": { select: { name: expectedRank } },
          },
        }),
      );
      updated++;
      const title = getTitle(page).replace(/[",\n]/g, " ");
      const addr = address.replace(/[",\n]/g, " ").slice(0, 60);
      csv.write(
        `${page.id},"${title}",${currentRank ?? ""},${expectedRank},${employees ?? ""},"${addr}"\n`,
      );
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
  console.log(`total scanned:    ${total}`);
  console.log(`already correct:  ${matched}`);
  console.log(`mismatched (kept):${mismatched}${FORCE ? " (force-overwriting)" : " (NOT changed: set FORCE=1 to overwrite)"}`);
  console.log(`no-address (≥30): ${noAddress} (rated B since 関東/関西判定不能)`);
  console.log(`to update:        ${toUpdate}`);
  console.log(`updated:          ${updated}`);
  console.log(`failed:           ${failed}`);
  console.log("");
  console.log("rank distribution (current → expected):");
  for (const [k, v] of Object.entries(transitionBreakdown).sort()) {
    console.log(`  ${k.padEnd(20)}: ${v}`);
  }
  console.log("");
  console.log("expected (after update) totals:");
  for (const [k, v] of Object.entries(toBreakdown).sort()) {
    console.log(`  ${k}: ${v}`);
  }
  if (DRY_RUN) {
    console.log("");
    console.log("[dry-run] no changes were made.");
    console.log("          - APPLY (fill empty): unset DRY_RUN, run as-is");
    console.log("          - APPLY (overwrite):  unset DRY_RUN, set FORCE=1");
  } else {
    console.log("");
    console.log(`log written → ${LOG_PATH}`);
  }
}

main().catch((e) => {
  console.error("[fatal]", e);
  process.exit(1);
});
