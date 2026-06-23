"use client";

import { useRouter } from "next/navigation";
import clsx from "clsx";

export default function PerfControls({ type, month }: { type: "日次" | "週次"; month: string }) {
  const router = useRouter();
  const go = (t: string, m: string) => router.push(`/performance?type=${encodeURIComponent(t)}&month=${m}`);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-lg bg-white/[0.06] p-0.5">
        {(["日次", "週次"] as const).map((t) => (
          <button
            key={t}
            onClick={() => go(t, month)}
            className={clsx("px-3 py-1.5 rounded-md text-sm font-medium", type === t ? "bg-surface text-brand-glow" : "text-ink-muted")}
          >
            {t}
          </button>
        ))}
      </div>
      <input
        type="month"
        value={month}
        onChange={(e) => go(type, e.target.value)}
        className="px-3 py-2 rounded-lg bg-night-1 ring-1 ring-white/10 text-sm focus:outline-none focus:ring-brand-glow/50"
      />
    </div>
  );
}
