import type { ExtractResponse, JobPosting } from "./types";

/** /api/extract を呼び出し、URL統合で求人票を取得する。 */
export async function requestExtract(urls: string[]): Promise<ExtractResponse> {
  const res = await fetch("/api/extract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "url", urls }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "抽出に失敗しました。");
  return data as ExtractResponse;
}

/** /api/extract を呼び出し、テキスト素案を整理して求人票を取得する。 */
export async function requestFromText(text: string): Promise<ExtractResponse> {
  const res = await fetch("/api/extract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "text", text }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "整理に失敗しました。");
  return data as ExtractResponse;
}

/** /api/pdf を呼び出し、PDFをダウンロードさせる。 */
export async function downloadPdf(job: JobPosting): Promise<void> {
  const res = await fetch("/api/pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(job),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || "PDF生成に失敗しました。");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `LET_求人票_${job.jobTitle || "募集職種"}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * 複数求人票をまとめた印刷ドキュメントを新規ウィンドウで開き、印刷（PDF保存）する。
 * 送信先で「PDFに保存」を選ぶと、全件が改ページで1つのPDFになる。
 */
export function printCombined(html: string): void {
  const win = window.open("", "_blank");
  if (!win) {
    throw new Error(
      "ポップアップがブロックされました。ブラウザのポップアップ許可を確認してください。",
    );
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  // フォント適用を待ってから印刷
  win.onload = () => {
    win.focus();
    window.setTimeout(() => win.print(), 400);
  };
}

/** 改行区切りテキストをURL配列へ整形する。 */
export function parseUrlLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}
