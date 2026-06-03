import type { FetchedPage } from "./fetch-html";

/** Claude へ渡す抽出指示（システムプロンプト）。 */
export const EXTRACTION_SYSTEM_PROMPT = `あなたは採用のプロフェッショナルです。
複数の他社求人ページのテキストを読み、それらを「1つの魅力的な求人票」に統合・再構成します。

ルール:
- 複数ソースから共通する良い要素を集約し、重複は排除して1枚に統合する。
- 事実が不明な項目は推測で埋めず空文字/空配列のままにする（虚偽を作らない）。
- 募集している企業名が読み取れる場合は companyName に入れる。連絡先や固有のサービス名はそのまま転記しない。
- コピーや業務内容は、転載ではなく要点を再構成した自然な日本語にする。
- 給与は数値が読み取れる場合のみ min/max に数値（円・整数）で入れる。月給か年収かを type に。
- 必ず指定されたJSONスキーマだけを出力する。前置き・説明・マークダウンは一切付けない。`;

/** テキスト整理モードのシステムプロンプト。 */
export const TEXT_SYSTEM_PROMPT = `あなたは採用のプロフェッショナルです。
採用担当者が書いた求人の素案・メモ・箇条書き・口語の文章を読み、
「1つの整った魅力的な求人票」に整理・再構成します。

ルール:
- 与えられた情報を尊重し、書かれていない事実は推測で創作しない（不明な項目は空のまま）。
- 雑なメモや口語を、求職者に伝わる自然で丁寧な日本語に整える。
- 箇条書きにできる内容（業務・要件・福利厚生等）は適切に項目分けする。
- 給与は数値が読み取れる場合のみ min/max に数値（円・整数）で入れる。月給か年収かを type に。
- 必ず指定されたJSONスキーマだけを出力する。前置き・説明・マークダウンは一切付けない。`;

/** 共通のJSONスキーマ説明（プロンプト末尾に付与）。 */
const JSON_SCHEMA_GUIDE = `JSONスキーマ:
{
  "companyName": "募集している企業名（読み取れる場合のみ。不明なら空文字）",
  "jobTitle": "募集職種（例: フロントエンドエンジニア）",
  "catchphrase": "求職者の心を掴む1行のキャッチコピー",
  "summary": "仕事内容の概要を2〜3文で",
  "responsibilities": ["具体的な業務内容を箇条書きで複数"],
  "requiredSkills": ["必須要件を箇条書きで"],
  "preferredSkills": ["歓迎要件を箇条書きで"],
  "idealCandidate": ["求める人物像を箇条書きで"],
  "appealPoints": ["この仕事・環境の魅力を箇条書きで"],
  "employmentType": "雇用形態（例: 正社員）",
  "salary": { "type": "月給 または 年収", "min": 数値またはnull, "max": 数値またはnull, "note": "補足（賞与・昇給等）" },
  "workLocation": "勤務地",
  "workHours": "勤務時間",
  "holidays": "休日・休暇",
  "benefits": ["福利厚生を箇条書きで"],
  "selectionProcess": ["選考プロセスを順番に"]
}`;

/** テキスト素案 → 求人票JSON のユーザープロンプトを組み立てる。 */
export function buildTextUserPrompt(text: string): string {
  return `次のJSONスキーマに厳密に従って、以下の求人の素案を整理した求人票を出力してください。

${JSON_SCHEMA_GUIDE}

求人の素案・メモ:
${text}

上記スキーマのJSONオブジェクトのみを出力してください。`;
}

/** スキーマ説明 + 抽出元テキストを組み立てる。 */
export function buildExtractionUserPrompt(pages: FetchedPage[]): string {
  const usable = pages.filter((p) => p.fetched && p.text);
  const sources = usable
    .map((p, i) => `--- 求人ソース ${i + 1} (${p.url}) ---\n${p.text}`)
    .join("\n\n");

  return `次のJSONスキーマに厳密に従って、求人票を1つにまとめて出力してください。

${JSON_SCHEMA_GUIDE}

抽出元の求人ページ:
${sources}

上記スキーマのJSONオブジェクトのみを出力してください。`;
}
