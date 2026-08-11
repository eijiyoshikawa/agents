"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function BackButton({ fallback = "/calls" }: { fallback?: string }) {
  const router = useRouter();
  const back = () => {
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else router.push(fallback);
  };
  return (
    <button
      onClick={back}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 text-ink-soft text-sm font-medium hover:bg-white/20 transition-colors"
    >
      <ArrowLeft size={15} /> 戻る
    </button>
  );
}
