"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { MapPin } from "lucide-react";

/**
 * 訪問候補チェックのワンタップ切替。各リストの行・企業情報（詳細）で共用。
 * Notion「訪問候補」＋Neonキャッシュへ即時反映（/api/visit-flag）。
 */
export default function VisitFlagButton({
  id,
  initial,
  withLabel,
}: {
  id: string;
  initial: boolean;
  withLabel?: boolean;
}) {
  const [on, setOn] = useState(initial);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setOn(initial);
  }, [id, initial]);

  const toggle = async () => {
    if (saving) return;
    const next = !on;
    setOn(next); // 楽観更新（失敗時に戻す）
    setSaving(true);
    try {
      const res = await fetch("/api/visit-flag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, flag: next }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "保存失敗");
    } catch {
      setOn(!next);
    } finally {
      setSaving(false);
    }
  };

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        toggle();
      }}
      disabled={saving}
      title={on ? "訪問候補から外す" : "訪問候補にする（訪問アプローチのCSVに入ります）"}
      className={clsx(
        "inline-flex items-center gap-1 rounded-lg text-xs font-medium ring-1 transition-colors px-2 py-1 disabled:opacity-60",
        on
          ? "bg-accent-teal/20 text-accent-teal ring-accent-teal/40 hover:bg-accent-teal/30"
          : "bg-white/5 text-ink-muted ring-white/10 hover:text-ink hover:bg-white/10",
      )}
    >
      <MapPin size={13} className={clsx(on && "fill-current")} />
      {withLabel && (on ? "訪問候補 ✓" : "訪問候補")}
    </button>
  );
}
