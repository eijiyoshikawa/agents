import { NextResponse } from "next/server";
import { ExtractRequestSchema, type ExtractResponse } from "@/lib/types";
import { fetchPages } from "@/lib/fetch-html";
import { extractJobPosting } from "@/lib/extract-job";

export const runtime = "nodejs";
export const maxDuration = 60;

/** 他社求人URL群 → AI抽出で統合した求人票JSONを返す。 */
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
      { error: "有効なURLを1〜8件入力してください。" },
      { status: 400 },
    );
  }

  try {
    const pages = await fetchPages(parsed.data.urls);
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
    const message = err instanceof Error ? err.message : "抽出に失敗しました。";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
