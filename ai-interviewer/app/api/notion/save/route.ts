import { NextResponse } from "next/server";
import { saveInterview } from "@/lib/notion";
import type { NotionSaveRequest } from "@/types/interview";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/notion/save
 *
 * Persist a completed interview (transcript + evaluation) to the Notion
 * Interview database. Returns the created page id.
 */
export async function POST(req: Request) {
  let body: NotionSaveRequest;
  try {
    body = (await req.json()) as NotionSaveRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.session?.id || !body.evaluation) {
    return NextResponse.json(
      { error: "session and evaluation required" },
      { status: 400 },
    );
  }

  try {
    const result = await saveInterview(body);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[notion/save] failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Notion save failed" },
      { status: 502 },
    );
  }
}
