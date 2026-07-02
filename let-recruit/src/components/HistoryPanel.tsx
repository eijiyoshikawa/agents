"use client";

import { Clock, Trash2, Pencil } from "lucide-react";
import type { HistoryEntry } from "@/lib/history";
import { formatSavedAt } from "@/lib/history";

interface Props {
  entries: HistoryEntry[];
  activeId: string | null;
  onOpen: (entry: HistoryEntry) => void;
  onDelete: (id: string) => void;
}

/** 保存済み求人票の履歴一覧。クリックで再編集できる。 */
export function HistoryPanel({ entries, activeId, onOpen, onDelete }: Props) {
  if (entries.length === 0) return null;

  return (
    <section className="mt-8 rounded-3xl border border-border-soft bg-white p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold tracking-[0.04em] text-brand-dark">
        <Clock className="h-4 w-4" />
        保存した求人票（{entries.length}件）
      </h2>
      <ul className="divide-y divide-border-soft">
        {entries.map((e) => (
          <li
            key={e.id}
            className={`flex items-center gap-3 py-2.5 ${
              e.id === activeId ? "rounded-lg bg-surface px-2" : "px-2"
            }`}
          >
            <button
              onClick={() => onOpen(e)}
              className="flex flex-1 items-center gap-2 text-left"
            >
              <Pencil className="h-3.5 w-3.5 shrink-0 text-[#9ca3af]" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-ink">
                  {e.title}
                </span>
                <span className="font-mono text-xs text-[#9ca3af]">
                  {formatSavedAt(e.savedAt)}
                  {e.id === activeId && " ・編集中"}
                </span>
              </span>
            </button>
            <button
              onClick={() => onDelete(e.id)}
              aria-label="削除"
              className="shrink-0 rounded-lg p-2 text-[#9ca3af] transition-colors hover:bg-[#fbe9ee] hover:text-[#ed315d]"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
