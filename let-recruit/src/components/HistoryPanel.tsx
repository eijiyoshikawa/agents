"use client";

import { useMemo, useState } from "react";
import { Clock, Trash2, Pencil, Search, Printer, Wand2 } from "lucide-react";
import type { HistoryEntry, BulkFieldKey } from "@/lib/history";
import { formatSavedAt, filterHistory, BULK_FIELDS } from "@/lib/history";

interface Props {
  entries: HistoryEntry[];
  activeId: string | null;
  onOpen: (entry: HistoryEntry) => void;
  onDelete: (id: string) => void;
  onBulkPrint: (ids: string[]) => void;
  onBulkUpdate: (
    ids: string[],
    field: BulkFieldKey,
    value: string,
    mode: "overwrite" | "fillEmpty",
  ) => void;
  onBulkDelete: (ids: string[]) => void;
}

/** 保存済み求人票の履歴一覧（検索・複数選択・一括操作つき）。 */
export function HistoryPanel({
  entries,
  activeId,
  onOpen,
  onDelete,
  onBulkPrint,
  onBulkUpdate,
  onBulkDelete,
}: Props) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [bulkField, setBulkField] = useState<BulkFieldKey>("companyWebsite");
  const [bulkValue, setBulkValue] = useState("");
  const [bulkMode, setBulkMode] = useState<"overwrite" | "fillEmpty">(
    "overwrite",
  );

  const filtered = useMemo(
    () => filterHistory(entries, query),
    [entries, query],
  );

  if (entries.length === 0) return null;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    const ids = filtered.map((e) => e.id);
    const allSelected = ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  }

  const selectedIds = filtered
    .map((e) => e.id)
    .filter((id) => selected.has(id));
  const hasSelection = selectedIds.length > 0;

  function runBulkUpdate() {
    if (!hasSelection) return;
    onBulkUpdate(selectedIds, bulkField, bulkValue, bulkMode);
    setShowBulkEdit(false);
    setBulkValue("");
  }

  return (
    <section className="mt-8 rounded-3xl border border-border-soft bg-white p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-bold tracking-[0.04em] text-brand-dark">
          <Clock className="h-4 w-4" />
          保存した求人票（{entries.length}件）
        </h2>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="会社名・職種で検索"
            className="w-56 rounded-full border border-border-soft bg-surface py-2 pl-9 pr-3 text-sm outline-none focus:border-ink"
          />
        </div>
      </div>

      {/* 一括操作バー */}
      <div className="mb-2 flex flex-wrap items-center gap-2 border-b border-border-soft pb-2">
        <label className="flex items-center gap-2 text-xs text-ink">
          <input
            type="checkbox"
            checked={filtered.length > 0 && filtered.every((e) => selected.has(e.id))}
            onChange={toggleAll}
            className="h-4 w-4 accent-[color:var(--color-brand,#3a5a87)]"
          />
          全選択
        </label>
        <span className="text-xs text-[#9ca3af]">{selectedIds.length}件選択中</span>
        <div className="ml-auto flex flex-wrap gap-2">
          <button
            onClick={() => onBulkPrint(selectedIds)}
            disabled={!hasSelection}
            className="inline-flex items-center gap-1.5 rounded-full border border-ink bg-white px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-ink hover:text-cream disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Printer className="h-3.5 w-3.5" />
            一括PDF保存
          </button>
          <button
            onClick={() => setShowBulkEdit((v) => !v)}
            disabled={!hasSelection}
            className="inline-flex items-center gap-1.5 rounded-full border border-ink bg-white px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-ink hover:text-cream disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Wand2 className="h-3.5 w-3.5" />
            一括編集
          </button>
          <button
            onClick={() => hasSelection && onBulkDelete(selectedIds)}
            disabled={!hasSelection}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#ed315d] bg-white px-3 py-1.5 text-xs font-semibold text-[#ed315d] transition-colors hover:bg-[#ed315d] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" />
            一括削除
          </button>
        </div>
      </div>

      {/* 一括編集フォーム */}
      {showBulkEdit && hasSelection && (
        <div className="mb-3 rounded-2xl border border-border-soft bg-surface p-4">
          <p className="mb-2 text-xs font-semibold text-brand-dark">
            選択した {selectedIds.length} 件の項目を一括で設定
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={bulkField}
              onChange={(e) => setBulkField(e.target.value as BulkFieldKey)}
              className="rounded-xl border border-border-soft bg-white p-2 text-sm outline-none focus:border-ink"
            >
              {BULK_FIELDS.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </select>
            <span className="text-sm text-ink">を</span>
            <input
              value={bulkValue}
              onChange={(e) => setBulkValue(e.target.value)}
              placeholder="設定する値（例: https://let-inc.net/）"
              className="min-w-[220px] flex-1 rounded-xl border border-border-soft bg-white p-2 text-sm outline-none focus:border-ink"
            />
            <label className="flex items-center gap-1.5 text-xs text-ink">
              <input
                type="radio"
                checked={bulkMode === "overwrite"}
                onChange={() => setBulkMode("overwrite")}
              />
              上書き
            </label>
            <label className="flex items-center gap-1.5 text-xs text-ink">
              <input
                type="radio"
                checked={bulkMode === "fillEmpty"}
                onChange={() => setBulkMode("fillEmpty")}
              />
              空欄のみ
            </label>
            <button
              onClick={runBulkUpdate}
              className="rounded-full bg-ink px-4 py-2 text-xs font-semibold text-cream transition-colors hover:bg-brand"
            >
              適用
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-[#9ca3af]">
          「{query}」に一致する求人票はありません
        </p>
      ) : (
        <ul className="divide-y divide-border-soft">
          {filtered.map((e) => (
            <li
              key={e.id}
              className={`flex items-center gap-3 py-2.5 ${
                e.id === activeId ? "rounded-lg bg-surface px-2" : "px-2"
              }`}
            >
              <input
                type="checkbox"
                checked={selected.has(e.id)}
                onChange={() => toggle(e.id)}
                className="h-4 w-4 shrink-0 accent-[color:var(--color-brand,#3a5a87)]"
              />
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
      )}
    </section>
  );
}
