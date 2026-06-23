"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import clsx from "clsx";

/** キャッシュを無効化してNotionから最新を取り直すボタン。 */
export default function RefreshButton({ className }: { className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  const refresh = async () => {
    setBusy(true);
    setDone(false);
    try {
      await fetch("/api/refresh", { method: "POST" });
      startTransition(() => router.refresh());
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } finally {
      setBusy(false);
    }
  };

  const loading = busy || pending;
  return (
    <button
      onClick={refresh}
      disabled={loading}
      className={clsx(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-60",
        "bg-brand/15 text-brand-glow hover:bg-brand/25",
        className,
      )}
      title="キャッシュを更新してNotionから最新を再取得"
    >
      <RefreshCw size={14} className={clsx(loading && "animate-spin")} />
      {loading ? "更新中…" : done ? "✓ 更新しました" : "最新の情報に更新"}
    </button>
  );
}
