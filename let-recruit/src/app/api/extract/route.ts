import { NextResponse } from "next/server";
import { ExtractRequestSchema, type ExtractResponse } from "@/lib/types";
import { fetchPages } from "@/lib/fetch-html";
import { extractJobPosting, generateFromText } from "@/lib/extract-job";

export const runtime = "nodejs";
// 長い求人票の生成に備え、Proプラン上限の300秒まで許容
export const maxDuration = 300;

/** URL統合 または テキスト整理で求人票JSONを返す。 */
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
      { error: "入力内容をご確認ください（URL 1〜8件、またはテキスト10文字以上）。" },
      { status: 400 },
    );
  }

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
    const message = err instanceof Error ? err.message : "生成に失敗しました。";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
