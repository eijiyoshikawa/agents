// 厳密重複検出: 法人番号 + 住所一致 / 社名 + 住所一致
// 支店・営業所は別レコードとして保持される
//
// 出力: strict-duplicates-report.csv / .json

import { Client } from "@notionhq/client";
import fs from "node:fs";

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DATABASE_ID = "1ac3fae4-3499-4991-b465-e375bef7d66c";
const OUT_CSV = "strict-duplicates-report.csv";
const OUT_JSON = "strict-duplicates-report.json";

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

// 社名の正規化（法人格削除 + NFKC + 空白除去 + 小文字化）
function normalizeName(name) {
  if (!name) return "";
  let n = name;
  n = n.replace(/[株\(（]株[\)）]?式?会社/g, "");
  n = n.replace(/[（\(]?有[\)）]?限会社/g, "");
  n = n.replace(/[（\(]?合[\)）]?同会社/g, "");
  n = n.replace(/[（\(]?合[\)）]?資会社/g, "");
  n = n.replace(/[（\(]?合[\)）]?名会社/g, "");
  n = n.replace(/[（\(]?株[\)）]/g, "");
  n = n.replace(/[（\(]?有[\)）]/g, "");
  // 支店・営業所・センター等の拠点表記を削除（同名拠点同士を1グループに）
  n = n.replace(/(本社|本店|支店|営業所|支社|事業所|工場|センター|オフィス|拠点|出張所|サービスセンター)/g, "");
  n = n.normalize("NFKC");
  n = n.replace(/\s+/g, "");
  return n.toLowerCase();
}

// 住所の正規化（郵便番号削除 + NFKC + 空白除去 + 大字 小字 削除等）
function normalizeAddress(addr) {
  if (!addr) return "";
  let a = addr;
  // 郵便番号削除
  a = a.replace(/〒?\d{3}[-‐‑－]?\d{4}/g, "");
  // 全角→半角
  a = a.normalize("NFKC");
  // 「丁目」「番地」「番」「号」「-」等を統一
  a = a.replace(/丁目|番地|番|号/g, "-");
  a = a.replace(/[-‐‑–—−ー]/g, "-");
  // 連続するハイフン
  a = a.replace(/-+/g, "-");
  // 末尾のハイフン削除
  a = a.replace(/-$/g, "");
  // 空白削除
  a = a.replace(/\s+/g, "");
  return a.toLowerCase();
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
      phone: getText(p, "電話番号").replace(/[^0-9]/g, ""),
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

  // 厳密重複キー
  // - strict_corp_addr: 法人番号 + 正規化住所  (支店分離保持)
  // - strict_name_addr: 正規化社名 + 正規化住所 (法人番号無し社の重複検出)
  const byCorpAddr = new Map();
  const byNameAddr = new Map();

  for (const r of records) {
    const na = normalizeAddress(r.address);
    if (!na) continue; // 住所無しはスキップ

    if (r.corp_no) {
      const key = `${r.corp_no}|${na}`;
      if (!byCorpAddr.has(key)) byCorpAddr.set(key, []);
      byCorpAddr.get(key).push(r);
    }

    const nn = normalizeName(r.title);
    if (nn) {
      const key = `${nn}|${na}`;
      if (!byNameAddr.has(key)) byNameAddr.set(key, []);
      byNameAddr.get(key).push(r);
    }
  }

  const dupGroups = [];
  const seen = new Set();
  const addGroup = (kind, key, members) => {
    if (members.length < 2) return;
    const gkey = `${kind}:${key}`;
    if (seen.has(gkey)) return;
    seen.add(gkey);
    // メンバーの id 重複削除（重複検出ロジック上、同じレコードが両方に入る可能性）
    const uniqMembers = Array.from(
      new Map(members.map((m) => [m.id, m])).values(),
    );
    if (uniqMembers.length < 2) return;
    dupGroups.push({ kind, key, members: uniqMembers });
  };
  for (const [k, v] of byCorpAddr) addGroup("corp_addr", k, v);
  for (const [k, v] of byNameAddr) addGroup("name_addr", k, v);

  // 同じレコードが複数グループに入ってる場合に備え、最終的にユニーク化
  // (今回は kind 別なのでこのままで OK)

  console.error("");
  console.error("=== 厳密重複グループ集計 ===");
  const byKind = {};
  for (const g of dupGroups) {
    byKind[g.kind] = (byKind[g.kind] ?? 0) + 1;
  }
  for (const [k, v] of Object.entries(byKind).sort()) {
    console.error(`  ${k}: ${v} groups`);
  }
  console.error(`  total: ${dupGroups.length} groups`);
  console.error("");

  // CSV
  const csv = fs.createWriteStream(OUT_CSV);
  csv.write(
    "kind,key,group_size,page_id,title,corp_no,phone,url,address,rank,employees,media,created_time,notion_url\n",
  );
  for (const g of dupGroups) {
    for (const r of g.members) {
      const safe = (s) =>
        `"${String(s ?? "").replace(/"/g, '""').replace(/\n/g, " ")}"`;
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

  fs.writeFileSync(
    OUT_JSON,
    JSON.stringify(
      {
        summary: {
          total_records: records.length,
          dup_groups: dupGroups.length,
          by_kind: byKind,
        },
        groups: dupGroups,
      },
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
