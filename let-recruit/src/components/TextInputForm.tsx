"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

interface Props {
  loading: boolean;
  onSubmit: (text: string) => void;
}

const PLACEHOLDER = `例）
募集職種：フロントエンドエンジニア
仕事内容：自社プロダクトのUI開発。React/Next.jsで実装。デザイナーと連携。
必須：React実務2年以上、TypeScript
歓迎：デザインシステム経験
給与：月給35〜60万、賞与年2回
勤務地：東京・リモート併用
休日：完全週休2日、祝日
…など、箇条書きやメモ書きでOK。AIが整理します。`;

export function TextInputForm({ loading, onSubmit }: Props) {
  const [text, setText] = useState("");
  const valid = text.trim().length >= 10;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid && !loading) onSubmit(text);
      }}
      className="grow-in"
    >
      <label className="mb-2 block text-xs font-semibold tracking-[0.06em] text-brand-dark">
        [ STEP 01 ] 求人の素案・メモを入力（箇条書き・口語でOK）
      </label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={10}
        placeholder={PLACEHOLDER}
        className="w-full resize-y rounded-2xl border border-border-soft bg-surface p-4 text-sm leading-relaxed outline-none focus:border-ink"
      />
      <div className="mt-3 flex items-center justify-between">
        <span className="font-mono text-xs text-[#9ca3af]">
          {text.trim().length} 文字
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
          {loading ? "AIが整理中…" : "AIで求人票に整理"}
        </button>
      </div>
    </form>
  );
}
