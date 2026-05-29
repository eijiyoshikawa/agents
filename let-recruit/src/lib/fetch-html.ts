/** URLからHTMLを取得し、本文テキストへ整形する（AI抽出の前処理）。 */

const FETCH_TIMEOUT_MS = 15000;
const MAX_TEXT_LENGTH = 12000; // 1URLあたりの抽出テキスト上限（トークン節約）

export interface FetchedPage {
  url: string;
  fetched: boolean;
  text: string;
  note?: string;
}

/** 単一URLを取得して本文テキスト化する。失敗しても例外は投げず note を返す。 */
export async function fetchPageText(url: string): Promise<FetchedPage> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; LET-RecruitBot/1.0; +https://let.co.jp)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    clearTimeout(timer);

    if (!res.ok) {
      return { url, fetched: false, text: "", note: `HTTP ${res.status}` };
    }
    const html = await res.text();
    const text = htmlToText(html);
    if (!text) {
      return { url, fetched: false, text: "", note: "本文を抽出できませんでした" };
    }
    return { url, fetched: true, text };
  } catch (err) {
    const note = err instanceof Error ? err.message : "取得に失敗しました";
    return { url, fetched: false, text: "", note };
  }
}

/** 複数URLを並列取得する。 */
export async function fetchPages(urls: string[]): Promise<FetchedPage[]> {
  return Promise.all(urls.map((u) => fetchPageText(u)));
}

/** HTML文字列から script/style 等を除去し、可読テキストへ変換する。 */
export function htmlToText(html: string): string {
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");

  const withBreaks = stripped
    .replace(/<\/(p|div|li|tr|h[1-6]|section|article|br)>/gi, "\n")
    .replace(/<br\s*\/?>(?=)/gi, "\n");

  const text = withBreaks
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text.slice(0, MAX_TEXT_LENGTH);
}
