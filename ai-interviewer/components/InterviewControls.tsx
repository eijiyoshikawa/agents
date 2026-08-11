"use client";

import type { ReactNode } from "react";

export type ControlState =
  | "consent"
  | "ready"
  | "starting"
  | "live"
  | "ending"
  | "ended"
  | "error";

interface Props {
  state: ControlState;
  onStart: () => void;
  onEnd: () => void;
  rightSlot?: ReactNode;
}

export function InterviewControls({ state, onStart, onEnd, rightSlot }: Props) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-3">
        {state === "consent" || state === "ready" ? (
          <button
            type="button"
            onClick={onStart}
            disabled={state === "consent"}
            className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            面接を開始
          </button>
        ) : null}

        {state === "starting" && (
          <span className="text-sm text-slate-500">接続中…</span>
        )}

        {(state === "live" || state === "ending") && (
          <button
            type="button"
            onClick={onEnd}
            disabled={state === "ending"}
            className="rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {state === "ending" ? "終了処理中…" : "面接を終了"}
          </button>
        )}

        {state === "ended" && (
          <span className="text-sm text-emerald-700">面接が完了しました。</span>
        )}

        {state === "error" && (
          <span className="text-sm text-red-700">
            エラーが発生しました。リロードしてください。
          </span>
        )}
      </div>
      <div>{rightSlot}</div>
    </div>
  );
}
