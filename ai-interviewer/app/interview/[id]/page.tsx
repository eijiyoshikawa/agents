"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AvatarSession,
  type AvatarSessionHandle,
} from "@/components/AvatarSession";
import { ConsentDialog } from "@/components/ConsentDialog";
import { ConversationLog } from "@/components/ConversationLog";
import {
  InterviewControls,
  type ControlState,
} from "@/components/InterviewControls";
import {
  MicController,
  type MicControllerHandle,
} from "@/components/MicController";
import { useInterviewSession } from "@/lib/useInterviewSession";
import type { Job } from "@/types/interview";

const OPENING_LINE =
  "こんにちは。本日はお時間をいただきありがとうございます。" +
  "採用担当の佐藤美咲と申します。" +
  "まずは緊張をほぐすために、軽くお話しできればと思います。それではよろしくお願いいたします。";

const MAX_DURATION_MS = 30 * 60 * 1000;

export default function InterviewPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const search = useSearchParams();
  const jobId = search.get("job") ?? "";
  const candidateName = search.get("candidate") ?? "ゲスト";

  const [job, setJob] = useState<Job | null>(null);
  const [state, setState] = useState<ControlState>("consent");
  const [error, setError] = useState<string | null>(null);

  const avatarRef = useRef<AvatarSessionHandle>(null);
  const micRef = useRef<MicControllerHandle>(null);
  const avatarSpeakingRef = useRef(false);

  // Avatar speech orchestration ----------------------------------------------
  const speakSentence = useCallback(async (sentence: string) => {
    if (!avatarRef.current?.isReady()) return;
    micRef.current?.pauseCapture();
    try {
      await avatarRef.current.speak(sentence);
    } finally {
      micRef.current?.resumeCapture();
    }
  }, []);

  // Conversation state -------------------------------------------------------
  const session = useInterviewSession({
    sessionId: params.id,
    job: job ?? emptyJob(jobId),
    candidateName,
    onAvatarSentence: speakSentence,
    onError: (err) => {
      console.error(err);
      setError(err instanceof Error ? err.message : "Unknown error");
    },
  });

  // Fetch the job once ------------------------------------------------------
  useEffect(() => {
    if (!jobId) return;
    let aborted = false;
    (async () => {
      try {
        const res = await fetch(`/api/notion/job/${jobId}`);
        if (!res.ok) throw new Error(`Failed to load job (${res.status})`);
        const data = (await res.json()) as Job;
        if (!aborted) setJob(data);
      } catch (err) {
        if (!aborted) {
          setError(err instanceof Error ? err.message : "Job load failed");
        }
      }
    })();
    return () => {
      aborted = true;
    };
  }, [jobId]);

  // Start ------------------------------------------------------------------
  const start = useCallback(async () => {
    if (!job) return;
    setState("starting");
    try {
      await avatarRef.current?.start();
      await micRef.current?.start();
      avatarSpeakingRef.current = true;
      await avatarRef.current?.speak(OPENING_LINE);
      avatarSpeakingRef.current = false;
      setState("live");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Start failed");
      setState("error");
    }
  }, [job]);

  // End --------------------------------------------------------------------
  const end = useCallback(async () => {
    setState("ending");
    micRef.current?.stop();
    try {
      await avatarRef.current?.stop();
    } catch {
      /* best effort */
    }
    const evaluation = await session.endInterview();
    setState("ended");
    if (evaluation) router.push(`/result/${params.id}`);
  }, [params.id, router, session]);

  // Auto-end on Claude [INTERVIEW_END] -------------------------------------
  useEffect(() => {
    if (session.interviewEnded && state === "live") {
      end();
    }
  }, [end, session.interviewEnded, state]);

  // Auto-end at 30 min -----------------------------------------------------
  useEffect(() => {
    if (state !== "live") return;
    const timer = window.setTimeout(end, MAX_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [end, state]);

  // Barge-in on user voice while avatar is talking -------------------------
  const handleVoiceStart = useCallback(() => {
    if (state !== "live") return;
    if (avatarSpeakingRef.current) {
      avatarRef.current?.interrupt().catch(() => {});
    }
  }, [state]);

  // Render ----------------------------------------------------------------
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">
      {state === "consent" && (
        <ConsentDialog onAgree={() => setState("ready")} />
      )}

      <header>
        <h1 className="text-xl font-bold">AI面接官 — 一次面接</h1>
        <p className="mt-1 text-sm text-slate-500">
          候補者: {candidateName} ／ ポジション: {job?.position ?? "(読込中)"} ／ 企業:{" "}
          {job?.company ?? "(読込中)"}
        </p>
      </header>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <AvatarSession
          ref={avatarRef}
          avatarId={process.env.NEXT_PUBLIC_HEYGEN_AVATAR_ID ?? ""}
          voiceId={process.env.NEXT_PUBLIC_HEYGEN_VOICE_ID ?? ""}
          onUserStart={handleVoiceStart}
          onAvatarStartTalking={() => {
            avatarSpeakingRef.current = true;
          }}
          onAvatarStopTalking={() => {
            avatarSpeakingRef.current = false;
          }}
          onError={(e) => setError(e instanceof Error ? e.message : "avatar error")}
        />

        <ConversationLog
          turns={session.turns}
          liveTranscript={session.liveCandidate}
          liveReply={session.liveInterviewer}
        />
      </div>

      <InterviewControls
        state={state}
        onStart={start}
        onEnd={end}
        rightSlot={
          <MicController
            ref={micRef}
            onVoiceStart={handleVoiceStart}
            onUtterance={(blob) => session.submitCandidateUtterance(blob)}
            onError={(e) => setError(e instanceof Error ? e.message : "mic error")}
          />
        }
      />

      {!jobId && (
        <p className="text-xs text-slate-500">
          Tip: <code>?job=&lt;notion-page-id&gt;&amp;candidate=&lt;名前&gt;</code> をURLに付けて開始してください。
        </p>
      )}
    </main>
  );
}

function emptyJob(jobId: string): Job {
  return {
    id: jobId,
    title: "",
    company: "",
    position: "その他",
    jobDescription: "",
    requiredSkills: [],
    keyQuestions: [],
    evaluationCriteria: {},
  };
}
