"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { LET_COMPANY } from "@/lib/company";
import { printCombined } from "@/lib/client";
import { buildCombinedHtml } from "@/lib/template";
import {
  loadHistory,
  deleteEntry,
  deleteEntries,
  bulkUpdateField,
  type HistoryEntry,
  type BulkFieldKey,
} from "@/lib/history";
import { HistoryPanel } from "@/components/HistoryPanel";

export default function HistoryPage() {
  const router = useRouter();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHistory(loadHistory());
  }, []);

  function handleOpen(entry: HistoryEntry) {
    // メイン画面で開くよう、対象IDを控えて遷移
    window.sessionStorage.setItem("let-recruit-open-id", entry.id);
    router.push("/");
  }

  function handleDelete(id: string) {
    setHistory(deleteEntry(id));
  }

  function handleBulkDelete(ids: string[]) {
    setHistory(deleteEntries(ids));
  }

  function handleBulkPrint(ids: string[]) {
    const jobs = history.filter((e) => ids.includes(e.id)).map((e) => e.job);
    if (jobs.length === 0) return;
    try {
      printCombined(buildCombinedHtml(jobs, LET_COMPANY));
    } catch (e) {
      setError(e instanceof Error ? e.message : "印刷に失敗しました。");
    }
  }

  function handleBulkUpdate(
    ids: string[],
    field: BulkFieldKey,
    value: string,
    mode: "overwrite" | "fillEmpty",
  ) {
    setHistory(bulkUpdateField(ids, field, value, mode, Date.now()));
  }

  return (
    <main className="mx-auto max-w-[1280px] px-6 py-12 md:px-10">
      <header className="flex items-center justify-between border-b border-ink pb-6">
        <div>
          <span className="text-xl font-bold tracking-[0.04em] text-brand">
            株式会社LET - 求人票様式
          </span>
          <h1 className="mt-4 text-2xl font-bold">保存した求人票の一覧</h1>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-border-soft bg-white px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          作成画面へ戻る
        </Link>
      </header>

      {error && (
        <div className="mt-6 rounded-xl border border-[#ed315d] bg-white px-4 py-3 text-sm text-[#ed315d]">
          {error}
        </div>
      )}

      {history.length === 0 ? (
        <p className="mt-10 text-sm text-[#9ca3af]">
          まだ保存された求人票はありません。作成画面で求人票を作り「履歴に保存」してください。
        </p>
      ) : (
        <HistoryPanel
          entries={history}
          activeId={null}
          onOpen={handleOpen}
          onDelete={handleDelete}
          onBulkPrint={handleBulkPrint}
          onBulkUpdate={handleBulkUpdate}
          onBulkDelete={handleBulkDelete}
        />
      )}
    </main>
  );
}
