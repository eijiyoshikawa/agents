import { streamInterviewerReply } from "@/lib/claude";
import { fetchJob } from "@/lib/notion";
import { INTERVIEW_END_TOKEN, stripEndToken } from "@/lib/prompts";
import type { ClaudeChatRequest } from "@/types/interview";

/**
 * POST /api/claude
 *
 * Streams the interviewer's next utterance as newline-delimited JSON events:
 *
 *   {"type":"delta","text":"こんにちは"}
 *   {"type":"delta","text":"。"}
 *   {"type":"done","reply":"...","interviewEnded":false}
 *
 * The client reads chunks, accumulates deltas, and feeds sentence-bounded
 * fragments to HeyGen via SentenceBuffer.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: ClaudeChatRequest;
  try {
    body = (await req.json()) as ClaudeChatRequest;
  } catch {
    return jsonError("Invalid JSON body", 400);
  }
  if (!body.jobId || !body.candidateName || !Array.isArray(body.turns)) {
    return jsonError("Missing required fields", 400);
  }

  let job;
  try {
    job = await fetchJob(body.jobId);
  } catch (err) {
    console.error("[claude] fetchJob failed", err);
    return jsonError("Failed to load job from Notion", 502);
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) => {
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      };
      try {
        const { stream: deltas } = await streamInterviewerReply({
          job,
          candidateName: body.candidateName,
          turns: body.turns,
        });
        let accumulated = "";
        for await (const piece of deltas) {
          accumulated += piece;
          send({ type: "delta", text: piece });
        }
        const interviewEnded = accumulated.includes(INTERVIEW_END_TOKEN);
        send({
          type: "done",
          reply: stripEndToken(accumulated),
          interviewEnded,
        });
      } catch (err) {
        console.error("[claude] stream error", err);
        send({
          type: "error",
          message: err instanceof Error ? err.message : "Claude error",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
