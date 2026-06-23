"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";

export type DupMember = {
  id: string;
  name: string;
  url: string;
  status: string | null;
  phone: string | null;
  isRep: string | null;
  confirm: string | null;
};
export type DupGroup = { reason: string; key: string; members: DupMember[] };

export default function DuplicatesClient({ groups }: { groups: DupGroup[] }) {
  if (groups.length === 0) {
    return <div className="card p-8 text-center text-sm text-ink-muted">重複候補は見つかりませんでした。</div>;
  }
  return (
    <div className="space-y-3">
      {groups.map((g) => (
        <GroupCard key={g.key} group={g} />
      ))}
    </div>
  );
}

function GroupCard({ group }: { group: DupGroup }) {
  const [marked, setMarked] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const mark = async (id: string) => {
    setBusy(id);
    try {
      const res = await fetch("/api/dup-mark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, value: "重複（統合/既存に追記）" }),
      });
      const j = await res.json();
      if (j.ok) setMarked((m) => ({ ...m, [id]: true }));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="card p-4">
      <div className="text-xs text-ink-muted mb-2">
        {group.reason}が一致 ・ {group.members.length}件
      </div>
      <div className="space-y-2">
        {group.members.map((m) => (
          <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] last:border-0 pb-2">
            <div className="min-w-0">
              <a href={m.url} target="_blank" rel="noreferrer" className="text-ink hover:text-brand-glow hover:underline inline-flex items-center gap-1">
                {m.name}
                <ExternalLink size={11} className="text-ink-muted" />
              </a>
              <div className="text-xs text-ink-muted">
                {[m.phone, m.status, m.isRep].filter(Boolean).join(" ・ ") || "—"}
                {(marked[m.id] || m.confirm === "重複（統合/既存に追記）") && <span className="text-accent-amber"> ・重複マーク済</span>}
              </div>
            </div>
            <button
              onClick={() => mark(m.id)}
              disabled={busy === m.id || marked[m.id]}
              className="px-2.5 py-1 rounded-lg bg-white/10 text-ink-soft text-xs font-medium hover:bg-white/20 disabled:opacity-50"
            >
              {marked[m.id] ? "✓ マーク済" : "重複としてマーク"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
