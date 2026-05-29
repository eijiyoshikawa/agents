"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { parseUrlLines } from "@/lib/client";

interface Props {
  loading: boolean;
  onSubmit: (urls: string[]) => void;
}

export function UrlInputForm({ loading, onSubmit }: Props) {
  const [text, setText] = useState("");
  const urls = parseUrlLines(text);
  const valid = urls.length > 0 && urls.length <= 8;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid && !loading) onSubmit(urls);
      }}
      className="grow-in"
    >
      <label className="mb-2 block text-xs font-semibold tracking-[0.06em] text-brand-dark">
        [ STEP 01 ] 参考にする他社求人のURL（1行に1つ・最大8件）
      </label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        placeholder={"https://example.com/jobs/123\nhttps://other.com/recruit/456"}
        className="w-full resize-y rounded-2xl border border-border-soft bg-surface p-4 font-mono text-sm leading-relaxed outline-none focus:border-ink"
      />
      <div className="mt-3 flex items-center justify-between">
        <span className="font-mono text-xs text-[#9ca3af]">
          {urls.length} / 8 URL
        </span>
        <button
          type="submit"
          disabled={!valid || loading}
          className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-cream transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {loading ? "AIが求人票を作成中…" : "求人票をAI生成"}
        </button>
      </div>
    </form>
  );
}
