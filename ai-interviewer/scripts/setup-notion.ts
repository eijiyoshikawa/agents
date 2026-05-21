/**
 * Notion DB setup for AI Interviewer.
 *
 * Creates two databases under a parent page:
 *   - Job DB         (read by the app)
 *   - Interview DB   (written by the app)
 *
 * Prereqs:
 *   1. Create an internal integration: https://www.notion.so/my-integrations
 *   2. Share the parent page with that integration ("Add connections")
 *   3. Set NOTION_API_KEY in .env.local
 *
 * Usage:
 *   npm run setup:notion -- <parent-page-id>
 *
 *   <parent-page-id> can be a full Notion URL or a bare 32-char id.
 *
 * Outputs the two new database IDs which the user pastes into .env.local
 * (NOTION_JOB_DB_ID and NOTION_INTERVIEW_DB_ID).
 */

import { Client } from "@notionhq/client";

const POSITIONS = [
  { name: "営業" },
  { name: "エンジニア" },
  { name: "事務" },
  { name: "マーケティング" },
  { name: "デザイナー" },
  { name: "その他" },
];

const RECOMMENDATIONS = [
  { name: "通過", color: "green" as const },
  { name: "保留", color: "yellow" as const },
  { name: "不合格", color: "red" as const },
];

const STATUSES = [
  { name: "進行中", color: "blue" as const },
  { name: "完了", color: "green" as const },
  { name: "エラー", color: "red" as const },
];

async function main() {
  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) die("NOTION_API_KEY is not set. Add it to .env.local first.");

  const arg = process.argv[2];
  if (!arg) die("Usage: npm run setup:notion -- <parent-page-id-or-url>");
  const parentId = extractPageId(arg);

  const notion = new Client({ auth: apiKey });

  console.log(`Parent page: ${parentId}`);

  console.log("Creating Job DB ...");
  const jobDb = await notion.databases.create({
    parent: { type: "page_id", page_id: parentId },
    title: [{ type: "text", text: { content: "AI面接 - 求人情報DB" } }],
    properties: {
      Title: { title: {} },
      Company: { rich_text: {} },
      Position: { select: { options: POSITIONS } },
      JobDescription: { rich_text: {} },
      RequiredSkills: { multi_select: { options: [] } },
      KeyQuestions: { rich_text: {} },
      EvaluationCriteria: { rich_text: {} },
    },
  });
  console.log(`  -> ${jobDb.id}`);

  console.log("Creating Interview DB ...");
  const interviewDb = await notion.databases.create({
    parent: { type: "page_id", page_id: parentId },
    title: [{ type: "text", text: { content: "AI面接 - 面接記録DB" } }],
    properties: {
      InterviewID: { title: {} },
      CandidateName: { rich_text: {} },
      JobRelation: {
        relation: {
          database_id: jobDb.id,
          single_property: {},
        },
      },
      StartedAt: { date: {} },
      EndedAt: { date: {} },
      DurationSec: { number: {} },
      Transcript: { rich_text: {} },
      Evaluation: { rich_text: {} },
      OverallScore: { number: {} },
      Recommendation: { select: { options: RECOMMENDATIONS } },
      Status: { select: { options: STATUSES } },
    },
  });
  console.log(`  -> ${interviewDb.id}`);

  console.log("\nDone. Add these to .env.local:\n");
  console.log(`NOTION_JOB_DB_ID=${jobDb.id}`);
  console.log(`NOTION_INTERVIEW_DB_ID=${interviewDb.id}`);
}

/**
 * Accepts:
 *  - bare 32-char id (`34fc57ee1f6080f6bb6fe3040f8f06cf`)
 *  - dashed UUID (`34fc57ee-1f60-80f6-bb6f-e3040f8f06cf`)
 *  - Notion URL ending in `...-<id>` or `?p=<id>`
 */
function extractPageId(arg: string): string {
  const cleaned = arg.trim();
  const match = cleaned.match(/[0-9a-f]{32}/i);
  if (match) return formatUuid(match[0]);
  const dashed = cleaned.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
  );
  if (dashed) return dashed[0];
  die(`Could not extract a Notion page id from: ${arg}`);
}

function formatUuid(hex: string): string {
  const h = hex.toLowerCase();
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function die(msg: string): never {
  console.error(msg);
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
