import { NextResponse } from "next/server";
import { fetchJob } from "@/lib/notion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/notion/job/[id]
 *
 * Retrieve a job page from the Notion job DB and return it as a `Job`.
 * Used by the interview room to inject job context into the prompt.
 */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  if (!params.id) {
    return NextResponse.json({ error: "Missing job id" }, { status: 400 });
  }
  try {
    const job = await fetchJob(params.id);
    return NextResponse.json(job, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[notion/job] failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Notion error" },
      { status: 502 },
    );
  }
}
