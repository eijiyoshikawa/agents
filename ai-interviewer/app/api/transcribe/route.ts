import { NextResponse } from "next/server";
import { transcribeUtterance } from "@/lib/deepgram";

/**
 * POST /api/transcribe
 *
 * Body: raw audio bytes (any container Deepgram understands; webm/opus is
 * what the browser MediaRecorder produces by default).
 *
 * Response: { transcript, confidence }
 *
 * Vercel limits request bodies to ~4.5MB on the Node runtime which is plenty
 * for a single utterance; longer captures should be split client-side.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 4 * 1024 * 1024; // 4MB safety cap

const KEYWORDS = [
  // domain-specific words frequently mistranscribed
  "Sakupass",
  "LET",
  "STAR",
  "SaaS",
  "Notion",
  "Vercel",
];

export async function POST(req: Request) {
  const buf = Buffer.from(await req.arrayBuffer());
  if (buf.length === 0) {
    return NextResponse.json({ error: "Empty audio body" }, { status: 400 });
  }
  if (buf.length > MAX_BYTES) {
    return NextResponse.json(
      { error: "Audio body exceeds 4MB" },
      { status: 413 },
    );
  }

  try {
    const result = await transcribeUtterance(buf, { keywords: KEYWORDS });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[transcribe] failed", err);
    const msg = err instanceof Error ? err.message : "Transcription failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
