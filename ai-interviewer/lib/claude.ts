import Anthropic from "@anthropic-ai/sdk";
import type { Job, Turn } from "@/types/interview";
import { INTERVIEWER_SYSTEM_PROMPT } from "@/lib/prompts";

/**
 * Server-side Claude wrapper for the interviewer + evaluator flows.
 *
 * Note on model id: spec says "Claude Sonnet 4.5". The CLAUDE.md guidance
 * recommends the latest model; we read it from CLAUDE_MODEL with a sensible
 * default so it can be bumped without redeploying code.
 */

const KEY_ENV = "ANTHROPIC_API_KEY";
export const DEFAULT_MODEL = process.env.CLAUDE_MODEL ?? "claude-sonnet-4-5";

let cached: Anthropic | null = null;
export function getAnthropic(): Anthropic {
  if (cached) return cached;
  const apiKey = process.env[KEY_ENV];
  if (!apiKey) throw new Error(`${KEY_ENV} is not configured`);
  cached = new Anthropic({ apiKey });
  return cached;
}

/** Convert our Turn[] into Anthropic message format. System prompt is separate. */
export function turnsToMessages(turns: Turn[]): Anthropic.MessageParam[] {
  return turns
    .filter((t) => t.role !== "system")
    .map((t) => ({
      role: t.role === "interviewer" ? ("assistant" as const) : ("user" as const),
      content: t.content,
    }));
}

export interface InterviewerCallArgs {
  job: Job;
  candidateName: string;
  turns: Turn[];
}

/**
 * Stream the interviewer's next utterance as an async iterator of text deltas.
 * The caller is responsible for accumulating the full reply.
 */
export async function streamInterviewerReply(
  args: InterviewerCallArgs,
): Promise<{ stream: AsyncIterable<string> }> {
  const client = getAnthropic();
  const system = INTERVIEWER_SYSTEM_PROMPT(args.job, args.candidateName);
  const messages = turnsToMessages(args.turns);

  const response = client.messages.stream({
    model: DEFAULT_MODEL,
    max_tokens: 600,
    system,
    messages,
  });

  async function* iterator(): AsyncIterable<string> {
    for await (const event of response) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        yield event.delta.text;
      }
    }
  }

  return { stream: iterator() };
}

/** Non-streaming evaluation call. */
export async function callEvaluator(prompt: string): Promise<string> {
  const client = getAnthropic();
  const res = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  });
  const block = res.content[0];
  if (!block || block.type !== "text") {
    throw new Error("Evaluator returned no text content");
  }
  return block.text;
}
