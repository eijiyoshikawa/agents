import { createClient } from "@deepgram/sdk";

/**
 * Server-side Deepgram client.
 *
 * We use the *pre-recorded* transcribe API on small per-utterance audio blobs
 * (≤30s) instead of streaming WebSockets. Reasons:
 *  - Vercel serverless does not run long-lived WebSockets reliably.
 *  - VAD already identifies utterance boundaries in the browser, so the
 *    pre-recorded path is simpler and ~equivalent latency for short turns.
 */

const KEY_ENV = "DEEPGRAM_API_KEY";

export function getDeepgramClient() {
  const key = process.env[KEY_ENV];
  if (!key) throw new Error(`${KEY_ENV} is not configured`);
  return createClient(key);
}

export interface TranscribeOptions {
  /** Common Japanese business / interview keywords to bias recognition. */
  keywords?: string[];
}

export interface TranscribeResult {
  transcript: string;
  /** Average word-level confidence for the utterance, 0–1. */
  confidence: number;
}

/**
 * Transcribe a single utterance. `audio` should be a complete audio blob
 * (webm/opus from MediaRecorder works fine) of a few seconds at most.
 */
export async function transcribeUtterance(
  audio: Buffer,
  opts: TranscribeOptions = {},
): Promise<TranscribeResult> {
  const dg = getDeepgramClient();
  const { result, error } = await dg.listen.prerecorded.transcribeFile(audio, {
    model: "nova-3",
    language: "ja",
    smart_format: true,
    punctuate: true,
    keywords: opts.keywords,
  });
  if (error) throw error;

  const alt = result?.results?.channels?.[0]?.alternatives?.[0];
  return {
    transcript: alt?.transcript?.trim() ?? "",
    confidence: alt?.confidence ?? 0,
  };
}
