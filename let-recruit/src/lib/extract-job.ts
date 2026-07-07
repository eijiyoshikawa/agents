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
// 詳細求人票は項目が多く応答が長くなるため、余裕を持った上限にする
const MAX_TOKENS = 32000;

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
  // max_tokensが大きい場合、SDKはストリーミングでの呼び出しを必須とするため
  // stream()で受信し、完了メッセージを組み立てる（結果は非ストリーミングと同じ）
  const stream = client.messages.stream({
    model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
    max_tokens: MAX_TOKENS,
    system,
    messages: [{ role: "user", content: userPrompt }],
  });
  const message = await stream.finalMessage();

  const raw = firstText(message);
  const truncated = message.stop_reason === "max_tokens";
  try {
    return parseJobJson(raw);
  } catch (err) {
    if (truncated) {
      throw new Error(
        "AIの応答が長すぎて途中で途切れました。入力する求人情報を減らして再度お試しください。",
      );
    }
    throw err;
  }
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
 */
export async function extractJobPosting(
  pages: FetchedPage[],
): Promise<JobPosting> {
  if (!pages.some((p) => p.fetched && p.text)) {
    throw new Error(
      "有効な求人ページを取得できませんでした。URLをご確認ください。",
    );
  }
  return callClaude(EXTRACTION_SYSTEM_PROMPT, buildExtractionUserPrompt(pages));
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
    // 途中切れ等で壊れたJSONの修復を試みる
    const repaired = repairTruncatedJson(jsonText);
    try {
      parsed = JSON.parse(repaired);
    } catch {
      throw new Error("AIの応答をJSONとして解析できませんでした。");
    }
  }
  return JobPostingSchema.parse(parsed);
}

/** ```json フェンスや前後の文章を除去して純粋なJSON文字列を得る。 */
export function extractJsonBlock(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)(?:```|$)/i);
  const candidate = fenced ? fenced[1] : raw;
  const start = candidate.indexOf("{");
  if (start === -1) {
    throw new Error("AIの応答にJSONが含まれていませんでした。");
  }
  const end = candidate.lastIndexOf("}");
  // 閉じ括弧が無い（途中切れ）場合も、修復に回すため先頭から末尾まで返す
  if (end <= start) return candidate.slice(start);
  return candidate.slice(start, end + 1);
}

/**
 * 途中で切れたJSONを可能な範囲で修復し、パース可能な文字列を返す。
 * 1) 開きっぱなしの文字列/括弧を閉じてみる
 * 2) だめなら文字列外の最後のカンマまで切り戻して閉じる…を繰り返す
 * どうしても直らなければ例外。
 */
export function repairTruncatedJson(text: string): string {
  let candidate = text;
  for (let attempt = 0; attempt < 200; attempt++) {
    const closed = closeUnclosed(candidate);
    try {
      JSON.parse(closed);
      return closed;
    } catch {
      // 文字列外の最後のカンマまで切り戻す（カンマの直前は必ず完全な値）
      const cut = lastCommaOutsideString(candidate);
      if (cut === -1) break;
      candidate = candidate.slice(0, cut);
    }
  }
  throw new Error("AIの応答をJSONとして解析できませんでした。");
}

/** 開きっぱなしの文字列と括弧を末尾に補って閉じる。 */
function closeUnclosed(text: string): string {
  const stack: string[] = [];
  let inString = false;
  let escaped = false;
  for (const ch of text) {
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{" || ch === "[") stack.push(ch === "{" ? "}" : "]");
    else if (ch === "}" || ch === "]") stack.pop();
  }
  let out = text;
  if (inString) out += '"';
  out = out.replace(/[,\s]+$/, "");
  while (stack.length) out += stack.pop();
  return out;
}

/** 文字列リテラルの外にある最後のカンマ位置を返す（無ければ-1）。 */
function lastCommaOutsideString(text: string): number {
  let inString = false;
  let escaped = false;
  let last = -1;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === ",") last = i;
  }
  return last;
}
