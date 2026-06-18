import { Client } from "@notionhq/client";
import fs from "node:fs";

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DATABASE_ID = "1ac3fae4-3499-4991-b465-e375bef7d66c";
const OUT_CSV = "duplicates-report.csv";
const OUT_JSON = "duplicates-report.json";

if (!NOTION_TOKEN) {
  console.error("error: NOTION_TOKEN required");
  process.exit(1);
}

const notion = new Client({ auth: NOTION_TOKEN, notionVersion: "2022-06-28" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
  let count = 0;
  while (true) {
    const res = await withRetry(() =>
      notion.databases.query({
        database_id: DATABASE_ID,
        page_size: 100,
        start_cursor: cursor,
      }),
    );
    for (const p of res.results) {
      count++;
      if (count % 500 === 0) console.error(`[fetch] ${count}`);
      yield p;
    }
    if (!res.has_more) break;
    cursor = res.next_cursor;
  }
}

const getText = (p, k) =>
  (p.properties?.[k]?.rich_text ?? []).map((t) => t.plain_text).join("");
const getTitle = (p) =>
  (p.properties?.["顧客名"]?.title ?? []).map((t) => t.plain_text).join("");
const getSelect = (p, k) => p.properties?.[k]?.select?.name ?? null;
const getNumber = (p, k) => p.properties?.[k]?.number ?? null;
const getUrl = (p, k) => p.properties?.[k]?.url ?? "";
const getMulti = (p, k) =>
  (p.properties?.[k]?.multi_select ?? []).map((s) => s.name).join("|");

// 社名の正規化（株式会社/(株)/全角半角/スペース等）
function normalizeName(name) {
  if (!name) return "";
  let n = name;
  // 法人格を一旦削除
  n = n.replace(/[株\(（]株[\)）]?式?会社/g, "");
  n = n.replace(/[（\(]?有[\)）]?限会社/g, "");
  n = n.replace(/[（\(]?合[\)）]?同会社/g, "");
  n = n.replace(/[（\(]?合[\)）]?資会社/g, "");
  n = n.replace(/[（\(]?合[\)）]?名会社/g, "");
  n = n.replace(/[（\(]?社[\)）]?団法人/g, "");
  n = n.replace(/[（\(]?財[\)）]?団法人/g, "");
  n = n.replace(/学校法人|医療法人|宗教法人/g, "");
  n = n.replace(/[（\(]?株[\)）]/g, "");
  n = n.replace(/[（\(]?有[\)）]/g, "");
  // NFKC で全角→半角
  n = n.normalize("NFKC");
  // 空白除去
  n = n.replace(/\s+/g, "");
  // 大文字小文字統一
  n = n.toLowerCase();
  return n;
}

function normalizePhone(phone) {
  if (!phone) return "";
  return phone.replace(/[^0-9]/g, "");
}

function urlHost(url) {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

async function main() {
  console.error("[scan] fetching all Notion records...");
  const records = [];
  for await (const p of fetchAll()) {
    records.push({
      id: p.id,
      url_notion: p.url,
      title: getTitle(p),
      corp_no: getText(p, "法人番号").trim(),
      phone: normalizePhone(getText(p, "電話番号")),
      company_url: getUrl(p, "会社URL") || getText(p, "会社URL"),
      address: getText(p, "住所"),
      industry: getSelect(p, "業種"),
      rank: getSelect(p, "見込み度合い"),
      employees: getNumber(p, "従業員数"),
      media: getMulti(p, "掲載元メディア"),
      created_time: p.created_time,
    });
  }
  console.error(`[scan] ${records.length} records loaded`);

  // インデックス作成
  const byCorpNo = new Map();
  const byName = new Map();
  const byPhone = new Map();
  const byHost = new Map();
  for (const r of records) {
    if (r.corp_no) {
      if (!byCorpNo.has(r.corp_no)) byCorpNo.set(r.corp_no, []);
      byCorpNo.get(r.corp_no).push(r);
    }
    const nname = normalizeName(r.title);
    if (nname) {
      if (!byName.has(nname)) byName.set(nname, []);
      byName.get(nname).push(r);
    }
    if (r.phone && r.phone.length >= 10) {
      if (!byPhone.has(r.phone)) byPhone.set(r.phone, []);
      byPhone.get(r.phone).push(r);
    }
    const host = urlHost(r.company_url);
    if (host) {
      if (!byHost.has(host)) byHost.set(host, []);
      byHost.get(host).push(r);
    }
  }

  // 重複グループ抽出
  const dupGroups = [];
  const seenGroupKeys = new Set();
  const addGroup = (kind, key, members) => {
    if (members.length < 2) return;
    const gkey = `${kind}:${key}`;
    if (seenGroupKeys.has(gkey)) return;
    seenGroupKeys.add(gkey);
    dupGroups.push({ kind, key, members });
  };
  for (const [k, v] of byCorpNo) addGroup("corp_no", k, v);
  for (const [k, v] of byName) addGroup("name", k, v);
  for (const [k, v] of byPhone) addGroup("phone", k, v);
  for (const [k, v] of byHost) addGroup("url_host", k, v);

  console.error("");
  console.error("=== 重複グループ集計 ===");
  const byKind = {};
  for (const g of dupGroups) {
    byKind[g.kind] = (byKind[g.kind] ?? 0) + 1;
  }
  for (const [k, v] of Object.entries(byKind).sort()) {
    console.error(`  ${k}: ${v} groups`);
  }
  console.error(`  total: ${dupGroups.length} groups`);
  console.error("");

  // CSV 出力（手動レビュー用）
  const csv = fs.createWriteStream(OUT_CSV);
  csv.write(
    "kind,key,group_size,page_id,title,corp_no,phone,url,address,rank,employees,media,created_time,notion_url\n",
  );
  for (const g of dupGroups) {
    for (const r of g.members) {
      const safe = (s) => `"${String(s ?? "").replace(/"/g, '""').replace(/\n/g, " ")}"`;
      csv.write(
        `${g.kind},${safe(g.key)},${g.members.length},` +
          `${r.id},${safe(r.title)},${safe(r.corp_no)},${safe(r.phone)},` +
          `${safe(r.company_url)},${safe(r.address)},${safe(r.rank)},` +
          `${r.employees ?? ""},${safe(r.media)},${r.created_time},${safe(r.url_notion)}\n`,
      );
    }
  }
  csv.end();
  console.error(`[csv] written → ${OUT_CSV}`);

  // JSON 出力（プログラム処理用）
  fs.writeFileSync(
    OUT_JSON,
    JSON.stringify(
      { summary: { total_records: records.length, dup_groups: dupGroups.length, by_kind: byKind }, groups: dupGroups },
      null,
      2,
    ),
  );
  console.error(`[json] written → ${OUT_JSON}`);
}

main().catch((e) => {
  console.error("[fatal]", e);
  process.exit(1);
});
