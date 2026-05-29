import { NextResponse } from "next/server";
import { JobPostingSchema } from "@/lib/types";
import { LET_COMPANY } from "@/lib/company";
import { buildJobPostingHtml } from "@/lib/template";
import { htmlToPdf } from "@/lib/pdf";

export const runtime = "nodejs";
export const maxDuration = 60;

/** 求人票JSON → LETデザインのA4 PDFを返す。 */
export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "不正なリクエストです。" }, { status: 400 });
  }

  const parsed = JobPostingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "求人票データが不正です。" },
      { status: 400 },
    );
  }

  try {
    const html = buildJobPostingHtml(parsed.data, LET_COMPANY);
    const pdf = await htmlToPdf(html);
    const fileName = encodeURIComponent(
      `LET_求人票_${parsed.data.jobTitle || "募集職種"}.pdf`,
    );
    return new Response(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${fileName}`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "PDF生成に失敗しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** プレビュー用: 求人票HTMLをそのまま返す（iframe srcから利用可）。 */
export async function GET(): Promise<Response> {
  return NextResponse.json({ error: "POSTで求人票JSONを送信してください。" }, {
    status: 405,
  });
}
