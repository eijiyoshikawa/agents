import Anthropic from "@anthropic-ai/sdk";
import { JobPostingSchema, type JobPosting } from "./types";
<<<<<<< HEAD
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
=======
import { EXTRACTION_SYSTEM_PROMPT, buildExtractionUserPrompt } from "./prompt";
import type { FetchedPage } from "./fetch-html";

const DEFAULT_MODEL = "claude-sonnet-4-6";

/**
 * 取得済みページ群からClaudeで求人票を1つに統合抽出する。
 * APIキー未設定や抽出失敗時は明確なエラーを投げる。
 */
export async function extractJobPosting(
  pages: FetchedPage[],
>>>>>>> claude/evaluation-finance-dashboard-50w8t9
): Promise<JobPosting> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY が未設定です。.env.local に設定してください。",
    );
  }
<<<<<<< HEAD
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
=======
  if (!pages.some((p) => p.fetched && p.text)) {
    throw new Error("有効な求人ページを取得できませんでした。URLをご確認ください。");
  }

  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
    max_tokens: 4096,
    system: EXTRACTION_SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildExtractionUserPrompt(pages) }],
  });

  const raw = firstText(message);
  return parseJobJson(raw);
>>>>>>> claude/evaluation-finance-dashboard-50w8t9
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
<<<<<<< HEAD
  // 文字列内の生改行等を先にエスケープ（AIが長文フィールドで出しがち）
  const jsonText = sanitizeJsonControlChars(extractJsonBlock(raw));
=======
  const jsonText = extractJsonBlock(raw);
>>>>>>> claude/evaluation-finance-dashboard-50w8t9
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
<<<<<<< HEAD
    // 途中切れ等で壊れたJSONの修復を試みる
    try {
      parsed = JSON.parse(repairTruncatedJson(jsonText));
    } catch {
      console.error(
        "[extract-job] JSON解析失敗。応答先頭:",
        raw.slice(0, 300),
        "…応答末尾:",
        raw.slice(-200),
      );
      throw new Error("AIの応答をJSONとして解析できませんでした。");
    }
  }
  try {
    return JobPostingSchema.parse(parsed);
  } catch (err) {
    console.error("[extract-job] スキーマ検証失敗:", err);
    throw new Error(
      "AIの応答形式が想定と異なりました。もう一度お試しください。",
    );
  }
}

/**
 * AI応答のJSONによくある不正を修復する。
 * - 文字列リテラル内の生の改行・タブ → \n \t にエスケープ
 * - 文字列リテラル内の未エスケープ " → \" にエスケープ
 *   （例: "キャッチ"引用"コピー" のようにAIが引用符を素で埋め込むケース。
 *    " の直後が , } ] : か空白+それらの場合のみ「文字列の終端」とみなす）
 */
export function sanitizeJsonControlChars(text: string): string {
  let out = "";
  let inString = false;
  let escaped = false;
  const chars = Array.from(text);

  /** i番目の " が文字列の終端らしいか（直後の非空白が構造文字か末尾） */
  const looksLikeStringEnd = (i: number): boolean => {
    for (let j = i + 1; j < chars.length; j++) {
      const c = chars[j];
      if (c === " " || c === "\t") continue;
      // 改行を挟んで次行が構造文字/新キーで始まるケースも終端とみなす
      if (c === "\n" || c === "\r") continue;
      return c === "," || c === "}" || c === "]" || c === ":";
    }
    return true; // 末尾
  };

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (inString) {
      if (escaped) {
        escaped = false;
        out += ch;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        out += ch;
        continue;
      }
      if (ch === '"') {
        if (looksLikeStringEnd(i)) {
          inString = false;
          out += ch;
        } else {
          out += '\\"'; // 文中の引用符→エスケープ
        }
        continue;
      }
      if (ch === "\n") {
        out += "\\n";
        continue;
      }
      if (ch === "\r") {
        out += "\\r";
        continue;
      }
      if (ch === "\t") {
        out += "\\t";
        continue;
      }
      out += ch;
      continue;
    }
    if (ch === '"') inString = true;
    out += ch;
  }
  return out;
=======
    throw new Error("AIの応答をJSONとして解析できませんでした。");
  }
  return JobPostingSchema.parse(parsed);
>>>>>>> claude/evaluation-finance-dashboard-50w8t9
}

/** ```json フェンスや前後の文章を除去して純粋なJSON文字列を得る。 */
export function extractJsonBlock(raw: string): string {
<<<<<<< HEAD
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
=======
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : raw;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("AIの応答にJSONが含まれていませんでした。");
  }
  return candidate.slice(start, end + 1);
}
>>>>>>> claude/evaluation-finance-dashboard-50w8t9
