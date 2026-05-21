import { NextResponse } from "next/server";
import { callEvaluator } from "@/lib/claude";
import { parseEvaluation } from "@/lib/evaluation";
import { fetchJob } from "@/lib/notion";
import { EVALUATION_PROMPT } from "@/lib/prompts";
import type { EvaluateRequest, EvaluateResponse } from "@/types/interview";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/evaluate
 *
 * Body: { jobId, turns }
 * Returns: { evaluation }
 *
 * Called by the interview room when the avatar emits [INTERVIEW_END]
 * (or the user manually ends the session). The result is saved to Notion
 * via /api/notion/save in a separate request.
 */
export async function POST(req: Request) {
  let body: EvaluateRequest;
  try {
    body = (await req.json()) as EvaluateRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.jobId || !Array.isArray(body.turns) || body.turns.length === 0) {
    return NextResponse.json(
      { error: "jobId and non-empty turns required" },
      { status: 400 },
    );
  }

  try {
    const job = await fetchJob(body.jobId);
    const prompt = EVALUATION_PROMPT(body.turns, job);
    const raw = await callEvaluator(prompt);
    const evaluation = parseEvaluation(raw);
    const res: EvaluateResponse = { evaluation };
    return NextResponse.json(res);
  } catch (err) {
    console.error("[evaluate] failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Evaluation failed" },
      { status: 502 },
    );
  }
}
