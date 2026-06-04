import Anthropic from "@anthropic-ai/sdk";
import { JobPostingSchema, type JobPosting } from "./types";
import {
  EXTRACTION_SYSTEM_PROMPT,
  buildExtractionUserPrompt,
  TEXT_SYSTEM_PROMPT,
  buildTextUserPrompt,
} from "./prompt";
import type { FetchedPage } from "./fetch-html";

const DEFAULT_MODEL = "claude-sonnet-4-6";

/** Claude を呼び出し、応答テキストを求人票JSONへ正規化する共通処理。 */
async function callClaude(
  system: string,
  userPrompt: string,
): Promise<JobPosting> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY が未設定です。.env.local に設定してください。",
    );
  }
  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
    max_tokens: 8192,
    system,
    messages: [{ role: "user", content: userPrompt }],
  });
  return parseJobJson(firstText(message));
}

/** 自由記述テキストから求人票を整理生成する。 */
export async function generateFromText(text: string): Promise<JobPosting> {
  if (text.trim().length < 10) {
    throw new Error("テキストが短すぎます。もう少し詳しく入力してください。");
  }
  return callClaude(TEXT_SYSTEM_PROMPT, buildTextUserPrompt(text));
}

/**
 * 取得済みページ群からClaudeで求人票を1つに統合抽出する。
 * APIキー未設定や抽出失敗時は明確なエラーを投げる。
 */
export async function extractJobPosting(
  pages: FetchedPage[],
): Promise<JobPosting> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY が未設定です。.env.local に設定してください。",
    );
  }
  if (!pages.some((p) => p.fetched && p.text)) {
    throw new Error("有効な求人ページを取得できませんでした。URLをご確認ください。");
  }

  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
    max_tokens: 8192,
    system: EXTRACTION_SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildExtractionUserPrompt(pages) }],
  });

  const raw = firstText(message);
  return parseJobJson(raw);
}

/** Claudeレスポンスから最初のテキストブロックを取り出す。 */
function firstText(message: Anthropic.Message): string {
  const block = message.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("AIからテキスト応答が得られませんでした。");
  }
  return block.text;
}

/** テキストからJSONを取り出し、スキーマで正規化する。 */
export function parseJobJson(raw: string): JobPosting {
  const jsonText = extractJsonBlock(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error("AIの応答をJSONとして解析できませんでした。");
  }
  return JobPostingSchema.parse(parsed);
}

/** ```json フェンスや前後の文章を除去して純粋なJSON文字列を得る。 */
export function extractJsonBlock(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : raw;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("AIの応答にJSONが含まれていませんでした。");
  }
  return candidate.slice(start, end + 1);
}
