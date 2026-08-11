import { NextResponse } from "next/server";
import { ExtractRequestSchema, type ExtractResponse } from "@/lib/types";
import { fetchPages } from "@/lib/fetch-html";
<<<<<<< HEAD
import { extractJobPosting, generateFromText } from "@/lib/extract-job";

export const runtime = "nodejs";
// 長い求人票の生成に備え、Proプラン上限の300秒まで許容
export const maxDuration = 300;

/** URL統合 または テキスト整理で求人票JSONを返す。 */
=======
import { extractJobPosting } from "@/lib/extract-job";

export const runtime = "nodejs";
export const maxDuration = 60;

/** 他社求人URL群 → AI抽出で統合した求人票JSONを返す。 */
>>>>>>> claude/evaluation-finance-dashboard-50w8t9
export async function POST(req: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "不正なリクエストです。" }, { status: 400 });
  }

  const parsed = ExtractRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
<<<<<<< HEAD
      { error: "入力内容をご確認ください（URL 1〜8件、またはテキスト10文字以上）。" },
=======
      { error: "有効なURLを1〜8件入力してください。" },
>>>>>>> claude/evaluation-finance-dashboard-50w8t9
      { status: 400 },
    );
  }

<<<<<<< HEAD
  const data = parsed.data;
  try {
    // テキストモード
    if ("mode" in data && data.mode === "text") {
      const job = await generateFromText(data.text);
      const res: ExtractResponse = { job, sources: [] };
      return NextResponse.json(res);
    }

    // URLモード（mode:"url" または 後方互換の urls のみ）
    const urls = "urls" in data ? data.urls : [];
    const pages = await fetchPages(urls);
=======
  try {
    const pages = await fetchPages(parsed.data.urls);
>>>>>>> claude/evaluation-finance-dashboard-50w8t9
    const job = await extractJobPosting(pages);
    const res: ExtractResponse = {
      job,
      sources: pages.map((p) => ({
        url: p.url,
        fetched: p.fetched,
        note: p.note,
      })),
    };
    return NextResponse.json(res);
  } catch (err) {
<<<<<<< HEAD
    const message = err instanceof Error ? err.message : "生成に失敗しました。";
=======
    const message = err instanceof Error ? err.message : "抽出に失敗しました。";
>>>>>>> claude/evaluation-finance-dashboard-50w8t9
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
