"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { RmsVAD } from "@/lib/vad";

/**
 * MicController — captures the candidate's microphone, runs RMS VAD,
 * and on utterance-end emits the captured audio blob via `onUtterance`.
 *
 * It also fires `onVoiceStart` whenever speech begins, which the parent
 * uses to barge-in the avatar.
 *
 * Lifecycle: parent calls `start()` to request mic permission and begin
 * listening; `pauseCapture()` / `resumeCapture()` toggle whether utterance
 * blobs are emitted (we still keep the analyser running so VAD-based
 * barge-in stays live during avatar speech).
 */

export interface MicControllerHandle {
  start: () => Promise<void>;
  stop: () => void;
  pauseCapture: () => void;
  resumeCapture: () => void;
}

interface Props {
  onVoiceStart?: () => void;
  onUtterance?: (audio: Blob) => void;
  onError?: (err: unknown) => void;
}

export const MicController = forwardRef<MicControllerHandle, Props>(
  function MicController({ onVoiceStart, onUtterance, onError }, ref) {
    const streamRef = useRef<MediaStream | null>(null);
    const ctxRef = useRef<AudioContext | null>(null);
    const vadRef = useRef<RmsVAD | null>(null);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const captureEnabledRef = useRef(true);
    const recordingRef = useRef(false);
    const [active, setActive] = useState(false);

    useImperativeHandle(ref, () => ({
      start: async () => {
        if (active) return;
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });
          streamRef.current = stream;
          const ctx = new AudioContext();
          ctxRef.current = ctx;
          const source = ctx.createMediaStreamSource(stream);
          const recorder = new MediaRecorder(stream, {
            mimeType: pickMime(),
          });
          recorder.ondataavailable = (ev) => {
            if (ev.data.size > 0) chunksRef.current.push(ev.data);
          };
          recorderRef.current = recorder;

          const vad = new RmsVAD(ctx, source, {
            onVoiceStart: () => {
              onVoiceStart?.();
              if (!captureEnabledRef.current) return;
              if (recordingRef.current) return;
              chunksRef.current = [];
              try {
                recorder.start(250);
                recordingRef.current = true;
              } catch (err) {
                onError?.(err);
              }
            },
            onVoiceEnd: () => {
              if (!recordingRef.current) return;
              recorder.stop();
              recordingRef.current = false;
              recorder.onstop = () => {
                if (!captureEnabledRef.current) return;
                const blob = new Blob(chunksRef.current, {
                  type: recorder.mimeType,
                });
                chunksRef.current = [];
                if (blob.size > 0) onUtterance?.(blob);
              };
            },
          });
          vad.start();
          vadRef.current = vad;
          setActive(true);
        } catch (err) {
          onError?.(err);
          throw err;
        }
      },
      stop: () => {
        vadRef.current?.stop();
        vadRef.current = null;
        if (recorderRef.current?.state === "recording") {
          recorderRef.current.stop();
        }
        recorderRef.current = null;
        recordingRef.current = false;
        ctxRef.current?.close().catch(() => {});
        ctxRef.current = null;
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setActive(false);
      },
      pauseCapture: () => {
        captureEnabledRef.current = false;
      },
      resumeCapture: () => {
        captureEnabledRef.current = true;
      },
    }));

    useEffect(() => {
      return () => {
        vadRef.current?.stop();
        if (recorderRef.current?.state === "recording") {
          recorderRef.current.stop();
        }
        ctxRef.current?.close().catch(() => {});
        streamRef.current?.getTracks().forEach((t) => t.stop());
      };
    }, []);

    return (
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <span
          className={`h-2 w-2 rounded-full ${
            active ? "bg-emerald-500" : "bg-slate-400"
          }`}
        />
        {active ? "マイク稼働中" : "マイク停止"}
      </div>
    );
  },
);

function pickMime(): string {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];
  for (const m of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) {
      return m;
    }
  }
  return "";
}
