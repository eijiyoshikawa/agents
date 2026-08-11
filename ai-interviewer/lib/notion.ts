import { Client } from "@notionhq/client";
import type {
  PageObjectResponse,
  RichTextItemResponse,
} from "@notionhq/client/build/src/api-endpoints";
import type {
  Evaluation,
  InterviewSession,
  Job,
  KeyQuestion,
  Position,
  Recommendation,
} from "@/types/interview";

/**
 * Notion API wrapper.
 *
 * Two databases are referenced:
 *   - NOTION_JOB_DB_ID: read-only fetch of job postings
 *   - NOTION_INTERVIEW_DB_ID: write target for completed interview rows
 *
 * Property schemas are documented in README.md and enforced by
 * `scripts/setup-notion.ts`.
 */

const KEY_ENV = "NOTION_API_KEY";
const JOB_DB = "NOTION_JOB_DB_ID";
const INTERVIEW_DB = "NOTION_INTERVIEW_DB_ID";

let cached: Client | null = null;
export function getNotion(): Client {
  if (cached) return cached;
  const auth = process.env[KEY_ENV];
  if (!auth) throw new Error(`${KEY_ENV} is not configured`);
  cached = new Client({ auth });
  return cached;
}

const requireEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
};

// ---------------------------------------------------------------------------
// Job — read
// ---------------------------------------------------------------------------

export async function fetchJob(jobId: string): Promise<Job> {
  const notion = getNotion();
  const page = (await notion.pages.retrieve({ page_id: jobId })) as PageObjectResponse;
  return parseJobPage(page);
}

function parseJobPage(page: PageObjectResponse): Job {
  const props = page.properties;
  return {
    id: page.id,
    title: readTitle(props.Title) ?? "(無題)",
    company: readRichText(props.Company) ?? "",
    position: readSelect<Position>(props.Position) ?? "その他",
    jobDescription: readRichText(props.JobDescription) ?? "",
    requiredSkills: readMultiSelect(props.RequiredSkills),
    keyQuestions: parseJSONField<KeyQuestion[]>(props.KeyQuestions, []) ?? [],
    evaluationCriteria: parseJSONField(props.EvaluationCriteria, {}) ?? {},
  };
}

// ---------------------------------------------------------------------------
// Interview — write
// ---------------------------------------------------------------------------

export interface SaveInterviewArgs {
  session: InterviewSession;
  evaluation: Evaluation;
}

export async function saveInterview({
  session,
  evaluation,
}: SaveInterviewArgs): Promise<{ pageId: string }> {
  const notion = getNotion();
  const databaseId = requireEnv(INTERVIEW_DB);

  const startedAt = session.startedAt;
  const endedAt = session.endedAt ?? new Date().toISOString();
  const durationSec =
    session.durationSec ??
    Math.max(
      0,
      Math.floor((Date.parse(endedAt) - Date.parse(startedAt)) / 1000),
    );

  const created = await notion.pages.create({
    parent: { database_id: databaseId },
    properties: {
      InterviewID: { title: [text(session.id)] },
      CandidateName: { rich_text: [text(session.candidateName)] },
      JobRelation: { relation: [{ id: session.jobId }] },
      StartedAt: { date: { start: startedAt } },
      EndedAt: { date: { start: endedAt } },
      DurationSec: { number: durationSec },
      Transcript: {
        rich_text: chunkRichText(JSON.stringify(session.turns)),
      },
      Evaluation: {
        rich_text: chunkRichText(JSON.stringify(evaluation)),
      },
      OverallScore: { number: evaluation.overall_score },
      Recommendation: { select: { name: evaluation.recommendation } },
      Status: { select: { name: "完了" } },
    },
  });

  return { pageId: created.id };
}

/** Convenience used by setup script to ensure the DBs exist. */
export const NOTION_DB_ENVS = {
  JOB: JOB_DB,
  INTERVIEW: INTERVIEW_DB,
} as const;

// ---------------------------------------------------------------------------
// Interview — read (used by /result/[id])
// ---------------------------------------------------------------------------

export interface FetchedInterview {
  pageId: string;
  candidateName: string;
  jobId: string | null;
  startedAt: string | null;
  endedAt: string | null;
  durationSec: number | null;
  transcriptJson: string;
  evaluationJson: string;
  overallScore: number | null;
  recommendation: string | null;
  status: string | null;
}

export async function fetchInterviewById(
  interviewId: string,
): Promise<FetchedInterview | null> {
  const notion = getNotion();
  const databaseId = requireEnv(INTERVIEW_DB);
  const res = await notion.databases.query({
    database_id: databaseId,
    filter: {
      property: "InterviewID",
      title: { equals: interviewId },
    },
    page_size: 1,
  });
  const page = res.results[0] as PageObjectResponse | undefined;
  if (!page) return null;
  return parseInterviewPage(page);
}

function parseInterviewPage(page: PageObjectResponse): FetchedInterview {
  const props = page.properties;
  const dateStart = (p?: Prop) =>
    p && p.type === "date" ? (p.date?.start ?? null) : null;
  const numberValue = (p?: Prop) =>
    p && p.type === "number" ? p.number : null;
  const selectName = (p?: Prop) =>
    p && p.type === "select" ? (p.select?.name ?? null) : null;
  const relationFirst = (p?: Prop) =>
    p && p.type === "relation" ? (p.relation[0]?.id ?? null) : null;

  return {
    pageId: page.id,
    candidateName: readRichText(props.CandidateName) ?? "",
    jobId: relationFirst(props.JobRelation),
    startedAt: dateStart(props.StartedAt),
    endedAt: dateStart(props.EndedAt),
    durationSec: numberValue(props.DurationSec),
    transcriptJson: readRichText(props.Transcript) ?? "[]",
    evaluationJson: readRichText(props.Evaluation) ?? "{}",
    overallScore: numberValue(props.OverallScore),
    recommendation: selectName(props.Recommendation),
    status: selectName(props.Status),
  };
}

// ---------------------------------------------------------------------------
// Property readers
// ---------------------------------------------------------------------------

type Prop = PageObjectResponse["properties"][string];

function readTitle(prop?: Prop): string | null {
  if (!prop || prop.type !== "title") return null;
  return joinRich(prop.title);
}

function readRichText(prop?: Prop): string | null {
  if (!prop || prop.type !== "rich_text") return null;
  return joinRich(prop.rich_text);
}

function readSelect<T extends string>(prop?: Prop): T | null {
  if (!prop || prop.type !== "select") return null;
  return (prop.select?.name ?? null) as T | null;
}

function readMultiSelect(prop?: Prop): string[] {
  if (!prop || prop.type !== "multi_select") return [];
  return prop.multi_select.map((s) => s.name);
}

function parseJSONField<T>(prop: Prop | undefined, fallback: T): T {
  const raw = readRichText(prop);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function joinRich(items: RichTextItemResponse[]): string {
  return items.map((i) => i.plain_text).join("");
}

function text(content: string) {
  return { type: "text" as const, text: { content } };
}

/**
 * Notion rich_text content fields cap each item at 2000 characters.
 * Long transcripts/evaluations are split into multiple consecutive items.
 */
function chunkRichText(s: string) {
  const SIZE = 1900;
  const out: ReturnType<typeof text>[] = [];
  for (let i = 0; i < s.length; i += SIZE) {
    out.push(text(s.slice(i, i + SIZE)));
  }
  return out.length > 0 ? out : [text("")];
}

/** Type assertion helper exported for tests / setup script. */
export function assertRecommendation(value: string): Recommendation {
  if (value === "通過" || value === "保留" || value === "不合格") return value;
  throw new Error(`Invalid recommendation: ${value}`);
}
