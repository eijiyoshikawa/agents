"use client";

import { useCallback, useRef, useState } from "react";
import { SentenceBuffer } from "@/lib/sentence-buffer";
import type {
  ClaudeChatRequest,
  Evaluation,
  EvaluateResponse,
  InterviewSession,
  Job,
  NotionSaveRequest,
  Turn,
} from "@/types/interview";

/**
 * Custom hook that owns the conversation state machine.
 *
 * - keeps `turns` history
 * - provides `submitCandidateUtterance(audio)` which transcribes + asks Claude
 *   and yields sentence-bounded chunks via `onAvatarSentence`
 * - exposes `endInterview()` which runs evaluate + Notion save and returns a
 *   resolved evaluation so the caller can navigate to /result/[id]
 */

interface Args {
  sessionId: string;
  job: Job;
  candidateName: string;
  /** Called for each sentence as soon as it's complete. */
  onAvatarSentence: (sentence: string) => Promise<void> | void;
  onError: (err: unknown) => void;
}

export function useInterviewSession({
  sessionId,
  job,
  candidateName,
  onAvatarSentence,
  onError,
}: Args) {
  const turnsRef = useRef<Turn[]>([]);
  const startedAtRef = useRef<string>(new Date().toISOString());
  const [turns, setTurns] = useState<Turn[]>([]);
  const [liveCandidate, setLiveCandidate] = useState<string | null>(null);
  const [liveInterviewer, setLiveInterviewer] = useState<string | null>(null);
  const [interviewEnded, setInterviewEnded] = useState(false);
  const inFlightRef = useRef(false);

  const appendTurn = useCallback((turn: Turn) => {
    turnsRef.current = [...turnsRef.current, turn];
    setTurns(turnsRef.current);
  }, []);

  /**
   * Called by the parent on every utterance-end VAD event with the audio
   * blob. This drives the entire conversation cycle.
   */
  const submitCandidateUtterance = useCallback(
    async (audio: Blob) => {
      if (interviewEnded || inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        const transcript = await transcribe(audio);
        if (!transcript.trim()) return;
        appendTurn({
          role: "candidate",
          content: transcript,
          timestamp: new Date().toISOString(),
        });
        setLiveCandidate(null);

        await streamReplyAndSpeak({
          sessionId,
          job,
          candidateName,
          turns: turnsRef.current,
          onLiveDelta: (live) => setLiveInterviewer(live),
          onSentence: onAvatarSentence,
          onComplete: ({ reply, ended }) => {
            appendTurn({
              role: "interviewer",
              content: reply,
              timestamp: new Date().toISOString(),
            });
            setLiveInterviewer(null);
            if (ended) setInterviewEnded(true);
          },
        });
      } catch (err) {
        onError(err);
      } finally {
        inFlightRef.current = false;
      }
    },
    [appendTurn, candidateName, interviewEnded, job, onAvatarSentence, onError, sessionId],
  );

  const endInterview = useCallback(async (): Promise<Evaluation | null> => {
    setInterviewEnded(true);
    try {
      const evaluation = await evaluate(job.id, turnsRef.current);
      const session: InterviewSession = {
        id: sessionId,
        jobId: job.id,
        candidateName,
        startedAt: startedAtRef.current,
        endedAt: new Date().toISOString(),
        durationSec: Math.floor(
          (Date.now() - Date.parse(startedAtRef.current)) / 1000,
        ),
        phase: "ended",
        status: "completed",
        turns: turnsRef.current,
      };
      await saveToNotion({ session, evaluation });
      return evaluation;
    } catch (err) {
      onError(err);
      return null;
    }
  }, [candidateName, job.id, onError, sessionId]);

  return {
    turns,
    liveCandidate,
    liveInterviewer,
    interviewEnded,
    setLiveCandidate,
    submitCandidateUtterance,
    endInterview,
    startedAt: startedAtRef.current,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function transcribe(audio: Blob): Promise<string> {
  const res = await fetch("/api/transcribe", {
    method: "POST",
    headers: { "Content-Type": audio.type || "application/octet-stream" },
    body: audio,
  });
  if (!res.ok) {
    throw new Error(`Transcribe failed: ${res.status}`);
  }
  const data = (await res.json()) as { transcript: string; confidence: number };
  return data.transcript ?? "";
}

interface StreamArgs {
  sessionId: string;
  job: Job;
  candidateName: string;
  turns: Turn[];
  onLiveDelta: (live: string) => void;
  onSentence: (sentence: string) => Promise<void> | void;
  onComplete: (info: { reply: string; ended: boolean }) => void;
}

async function streamReplyAndSpeak(args: StreamArgs) {
  const body: ClaudeChatRequest = {
    sessionId: args.sessionId,
    jobId: args.job.id,
    candidateName: args.candidateName,
    turns: args.turns,
  };
  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) {
    throw new Error(`Claude request failed: ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const sentences = new SentenceBuffer();
  let pending = "";
  let liveText = "";
  let finalReply = "";
  let ended = false;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    pending += decoder.decode(value, { stream: true });
    const lines = pending.split("\n");
    pending = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      const evt = JSON.parse(line) as
        | { type: "delta"; text: string }
        | { type: "done"; reply: string; interviewEnded: boolean }
        | { type: "error"; message: string };
      if (evt.type === "delta") {
        liveText += evt.text;
        args.onLiveDelta(liveText);
        for (const s of sentences.push(evt.text)) {
          await args.onSentence(s);
        }
      } else if (evt.type === "done") {
        finalReply = evt.reply;
        ended = evt.interviewEnded;
      } else if (evt.type === "error") {
        throw new Error(evt.message);
      }
    }
  }
  const tail = sentences.flush();
  if (tail) await args.onSentence(tail);
  args.onComplete({ reply: finalReply || liveText, ended });
}

async function evaluate(jobId: string, turns: Turn[]): Promise<Evaluation> {
  const res = await fetch("/api/evaluate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jobId, turns }),
  });
  if (!res.ok) throw new Error(`Evaluate failed: ${res.status}`);
  const data = (await res.json()) as EvaluateResponse;
  return data.evaluation;
}

async function saveToNotion(payload: NotionSaveRequest): Promise<void> {
  const res = await fetch("/api/notion/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Notion save failed: ${res.status}`);
}
