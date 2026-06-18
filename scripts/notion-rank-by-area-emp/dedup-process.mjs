// 重複候補グループから「残す社」と「アーカイブする社」を判定
// 残す社の選定基準: データ充実度スコア → 古い社優先 (created_time)
// デフォルトでは corp_no 重複のみ自動アーカイブ、他はレビュー用CSV出力
//
// usage:
//   DRY_RUN=1 node dedup-process.mjs              # corp_no グループだけdry-run
//   node dedup-process.mjs                        # corp_no グループだけ実行
//   KINDS=corp_no,name DRY_RUN=1 node dedup...    # kind 拡張
//   KINDS=all node dedup-process.mjs              # 全部 (慎重に)

import { Client } from "@notionhq/client";
import fs from "node:fs";

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const REPORT = process.env.REPORT || "duplicates-report.json";
const DRY_RUN = process.env.DRY_RUN === "1";
const SLEEP_MS = Number(process.env.SLEEP_MS || 350);
const KINDS = (process.env.KINDS || "corp_no").split(",").map((s) => s.trim());
const OUT_CSV = "dedup-actions.csv";

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

// データ充実度スコア（高いほど残すべき）
function scoreMember(m) {
  let s = 0;
  if (m.corp_no) s += 10;
  if (m.phone && m.phone.length >= 10) s += 6;
  if (m.company_url) s += 4;
  if (m.employees != null) s += 3;
  if (m.rank) s += 2;
  if (m.media) s += 2;
  if (m.address) s += 1;
  return s;
}

// グループから残す/捨てるを選択（スコア最大 → 古い created_time 優先）
function pickWinner(members) {
  const sorted = [...members].sort((a, b) => {
    const sb = scoreMember(b) - scoreMember(a);
    if (sb !== 0) return sb;
    return new Date(a.created_time).getTime() - new Date(b.created_time).getTime();
  });
  return { winner: sorted[0], losers: sorted.slice(1) };
}

async function archivePage(pageId) {
  return withRetry(() =>
    notion.pages.update({ page_id: pageId, archived: true }),
  );
}

async function main() {
  const data = JSON.parse(fs.readFileSync(REPORT, "utf-8"));
  const groups = data.groups || [];
  const targetGroups = KINDS.includes("all")
    ? groups
    : groups.filter((g) => KINDS.includes(g.kind));

  console.log(`mode:        ${DRY_RUN ? "DRY_RUN" : "APPLY"}`);
  console.log(`kinds:       ${KINDS.join(", ")}`);
  console.log(`groups:      ${targetGroups.length} (out of ${groups.length})`);
  console.log("");

  let plannedArchive = 0;
  let archived = 0;
  let failed = 0;

  const csv = fs.createWriteStream(OUT_CSV);
  csv.write("kind,key,action,page_id,title,corp_no,phone,url,address,rank,employees,media,score,created_time\n");
  const safe = (s) => `"${String(s ?? "").replace(/"/g, '""').replace(/\n/g, " ")}"`;

  for (const g of targetGroups) {
    const { winner, losers } = pickWinner(g.members);
    const wrow = (action, m, score) =>
      csv.write(
        `${g.kind},${safe(g.key)},${action},${m.id},${safe(m.title)},` +
          `${safe(m.corp_no)},${safe(m.phone)},${safe(m.company_url)},` +
          `${safe(m.address)},${safe(m.rank)},${m.employees ?? ""},` +
          `${safe(m.media)},${score},${m.created_time}\n`,
      );
    wrow("KEEP", winner, scoreMember(winner));
    for (const l of losers) {
      wrow("ARCHIVE", l, scoreMember(l));
      plannedArchive++;
      if (DRY_RUN) continue;
      try {
        await archivePage(l.id);
        archived++;
        if (archived % 20 === 0) {
          console.log(`[progress] archived=${archived}/${plannedArchive}`);
        }
        await sleep(SLEEP_MS);
      } catch (e) {
        failed++;
        console.error(`[fail] ${l.id} ${l.title} → ${e.message}`);
      }
    }
  }
  csv.end();

  console.log("");
  console.log("=== summary ===");
  console.log(`planned archive: ${plannedArchive}`);
  console.log(`archived:        ${archived}`);
  console.log(`failed:          ${failed}`);
  console.log(`csv:             ${OUT_CSV}`);
  if (DRY_RUN) {
    console.log("");
    console.log("[dry-run] no Notion writes. Review CSV, then run without DRY_RUN=1");
  }
}

main().catch((e) => {
  console.error("[fatal]", e);
  process.exit(1);
});
