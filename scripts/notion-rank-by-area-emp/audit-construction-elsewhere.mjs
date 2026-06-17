import { Client } from "@notionhq/client";
import fs from "node:fs";

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DATABASE_ID = "1ac3fae4-3499-4991-b465-e375bef7d66c";
const OUT_CSV = "construction-suspected.csv";

if (!NOTION_TOKEN) {
  console.error("error: NOTION_TOKEN env var is required");
  process.exit(1);
}

const notion = new Client({
  auth: NOTION_TOKEN,
  notionVersion: "2022-06-28",
});

// 建設業を疑うキーワード
const CONSTRUCTION_KEYWORDS = [
  "建設", "建築", "工務店", "工務", "土木", "施工",
  "リフォーム", "住宅", "ハウス", "建材", "設備工事",
  "電気工事", "管工事", "塗装", "解体", "ゼネコン",
  "造園", "舗装", "鉄筋", "基礎工事",
];
const KEYWORD_RE = new RegExp(CONSTRUCTION_KEYWORDS.join("|"));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function withRetry(fn, attempt = 0) {
  try {
    return await fn();
  } catch (err) {
    const status = err.status ?? err.code;
    if (status === 429) {
      const retryAfter = Number(err.headers?.["retry-after"] ?? 1);
      await sleep(retryAfter * 1000);
      return withRetry(fn, attempt + 1);
    }
    if (typeof status === "number" && status >= 500 && attempt < 5) {
      await sleep(Math.min(2 ** attempt * 1000, 30_000));
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
        page_size: 100,
        start_cursor: cursor,
      }),
    );
    for (const page of res.results) yield page;
    if (!res.has_more) break;
    cursor = res.next_cursor;
  }
}

const getText = (page, key) => {
  const arr = page.properties?.[key]?.rich_text;
  if (!arr || arr.length === 0) return "";
  return arr.map((t) => t.plain_text).join("");
};
const getTitle = (page) => {
  const title = page.properties?.["顧客名"]?.title;
  if (!title || title.length === 0) return "";
  return title.map((t) => t.plain_text).join("");
};
const getSelect = (page, key) => page.properties?.[key]?.select?.name ?? null;
const getNumber = (page, key) => page.properties?.[key]?.number ?? null;

async function main() {
  console.log(`scanning DB ${DATABASE_ID}...`);
  console.log(`keywords: ${CONSTRUCTION_KEYWORDS.join(" | ")}`);
  console.log("");

  const industryBreakdown = {};
  const suspectedByIndustry = {};
  const samples = [];
  let total = 0;
  let suspected = 0;

  const csv = fs.createWriteStream(OUT_CSV);
  csv.write("page_id,title,industry,employee_count,rank,address,memo_excerpt\n");

  for await (const page of fetchAll()) {
    total++;
    const industry = getSelect(page, "業種") ?? "(empty)";
    industryBreakdown[industry] = (industryBreakdown[industry] ?? 0) + 1;

    if (industry === "建設") continue; // 既に建設

    const title = getTitle(page);
    const memo = getText(page, "備考");
    const description = getText(page, "事業内容") || memo;
    const haystack = `${title} ${description}`;

    if (KEYWORD_RE.test(haystack)) {
      suspected++;
      suspectedByIndustry[industry] = (suspectedByIndustry[industry] ?? 0) + 1;
      const rank = getSelect(page, "見込み度合い") ?? "";
      const emp = getNumber(page, "従業員数") ?? "";
      const address = getText(page, "住所").slice(0, 60);
      const safe = (s) => String(s).replace(/[",\n]/g, " ");
      csv.write(
        `${page.id},"${safe(title)}",${safe(industry)},${emp},${rank},"${safe(address)}","${safe(description.slice(0, 100))}"\n`,
      );
      if (samples.length < 20) {
        samples.push({ title, industry, employee: emp, rank, address });
      }
    }
  }
  csv.end();

  console.log("=== 業種分布 (全社) ===");
  for (const [k, v] of Object.entries(industryBreakdown).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(20)}: ${v}`);
  }

  console.log("");
  console.log(`=== 建設キーワードヒット (業種≠建設) ===`);
  console.log(`total scanned:     ${total}`);
  console.log(`suspected count:   ${suspected}`);
  console.log("");
  console.log("内訳 (元の業種ごと):");
  for (const [k, v] of Object.entries(suspectedByIndustry).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(20)}: ${v}`);
  }
  console.log("");
  console.log("=== sample 20件 ===");
  for (const s of samples) {
    console.log(
      `  [${s.industry}] ${s.title} | rank=${s.rank} | emp=${s.employee} | ${s.address.slice(0, 30)}`,
    );
  }
  console.log("");
  console.log(`full CSV written → ${OUT_CSV}`);
}

main().catch((e) => {
  console.error("[fatal]", e);
  process.exit(1);
});
