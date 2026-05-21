"use client";

import { useEffect, useRef } from "react";
import type { Turn } from "@/types/interview";

interface Props {
  turns: Turn[];
  liveTranscript?: string | null;
  liveReply?: string | null;
}

export function ConversationLog({ turns, liveTranscript, liveReply }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [turns, liveTranscript, liveReply]);

  return (
    <div
      ref={scrollerRef}
      className="h-full max-h-[480px] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm"
    >
      {turns.length === 0 && !liveTranscript && !liveReply && (
        <p className="text-slate-400">会話はまだありません。</p>
      )}
      <ol className="space-y-3">
        {turns.map((turn, i) => (
          <li key={i}>
            <Bubble role={turn.role} content={turn.content} />
          </li>
        ))}
        {liveTranscript ? (
          <li>
            <Bubble role="candidate" content={liveTranscript} ghost />
          </li>
        ) : null}
        {liveReply ? (
          <li>
            <Bubble role="interviewer" content={liveReply} ghost />
          </li>
        ) : null}
      </ol>
    </div>
  );
}

function Bubble({
  role,
  content,
  ghost,
}: {
  role: Turn["role"];
  content: string;
  ghost?: boolean;
}) {
  const isInterviewer = role === "interviewer";
  return (
    <div
      className={`flex flex-col ${isInterviewer ? "items-start" : "items-end"}`}
    >
      <span className="mb-1 text-[10px] uppercase tracking-wide text-slate-400">
        {isInterviewer ? "面接官 (佐藤美咲)" : "候補者"}
      </span>
      <div
        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 ${
          isInterviewer
            ? "bg-slate-100 text-slate-900"
            : "bg-emerald-600 text-white"
        } ${ghost ? "opacity-60" : ""}`}
      >
        {content}
      </div>
    </div>
  );
}
