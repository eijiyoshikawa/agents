"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { fetchHeyGenToken, HeyGenSession } from "@/lib/heygen";

/**
 * AvatarSession — owns the HeyGen video element and exposes an imperative
 * handle so the parent page can `speak()` Claude responses through it.
 *
 * The session is *not* started automatically: the parent calls `start()`
 * after the candidate gives consent and clicks Start.
 */

export interface AvatarSessionHandle {
  start: () => Promise<void>;
  speak: (text: string) => Promise<void>;
  interrupt: () => Promise<void>;
  stop: () => Promise<void>;
  isReady: () => boolean;
}

interface Props {
  avatarId: string;
  voiceId: string;
  onUserStart?: () => void;
  onAvatarStartTalking?: () => void;
  onAvatarStopTalking?: () => void;
  onError?: (err: unknown) => void;
}

type Status = "idle" | "connecting" | "live" | "stopped" | "error";

export const AvatarSession = forwardRef<AvatarSessionHandle, Props>(
  function AvatarSession(
    { avatarId, voiceId, onUserStart, onAvatarStartTalking, onAvatarStopTalking, onError },
    ref,
  ) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const sessionRef = useRef<HeyGenSession | null>(null);
    const [status, setStatus] = useState<Status>("idle");
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useImperativeHandle(ref, () => ({
      start: async () => {
        if (sessionRef.current || status === "connecting") return;
        if (!videoRef.current) {
          throw new Error("Video element not mounted");
        }
        setStatus("connecting");
        setErrorMsg(null);
        try {
          const token = await fetchHeyGenToken();
          const session = new HeyGenSession({
            token,
            avatarId,
            voiceId,
            videoEl: videoRef.current,
            onUserStart,
            onAvatarStartTalking,
            onAvatarStopTalking,
            onError: (e) => {
              setErrorMsg(asMessage(e));
              onError?.(e);
            },
          });
          await session.start();
          sessionRef.current = session;
          setStatus("live");
        } catch (err) {
          setErrorMsg(asMessage(err));
          setStatus("error");
          onError?.(err);
          throw err;
        }
      },
      speak: async (text: string) => {
        await sessionRef.current?.speak(text);
      },
      interrupt: async () => {
        await sessionRef.current?.interrupt();
      },
      stop: async () => {
        await sessionRef.current?.stop();
        sessionRef.current = null;
        setStatus("stopped");
      },
      isReady: () => status === "live" && sessionRef.current !== null,
    }));

    useEffect(() => {
      return () => {
        sessionRef.current?.stop().catch(() => {
          // best-effort cleanup
        });
        sessionRef.current = null;
      };
    }, []);

    return (
      <div className="relative w-full overflow-hidden rounded-2xl bg-slate-900 shadow-xl">
        <video
          ref={videoRef}
          className="aspect-video w-full"
          playsInline
          autoPlay
          muted={false}
        />
        <StatusBadge status={status} />
        {errorMsg && (
          <div className="absolute inset-x-0 bottom-0 bg-red-600/90 px-4 py-2 text-sm text-white">
            {errorMsg}
          </div>
        )}
      </div>
    );
  },
);

function StatusBadge({ status }: { status: Status }) {
  const label: Record<Status, string> = {
    idle: "未接続",
    connecting: "接続中…",
    live: "通話中",
    stopped: "終了",
    error: "エラー",
  };
  const tone: Record<Status, string> = {
    idle: "bg-slate-500",
    connecting: "bg-amber-500",
    live: "bg-emerald-500",
    stopped: "bg-slate-700",
    error: "bg-red-600",
  };
  return (
    <span
      className={`absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-white ${tone[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-white" />
      {label[status]}
    </span>
  );
}

function asMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Unknown error";
}
