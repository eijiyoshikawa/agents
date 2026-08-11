"use client";

<<<<<<< HEAD
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Printer,
  Save,
  FilePlus,
  ChevronDown,
  ChevronRight,
  Clock,
  ListFilter,
} from "lucide-react";
import type { ExtractResponse, JobPosting } from "@/lib/types";
import { emptyJobPosting } from "@/lib/types";
import { LET_COMPANY } from "@/lib/company";
import { requestExtract, requestFromText, printCombined } from "@/lib/client";
import { buildCombinedHtml } from "@/lib/template";
import {
  loadHistory,
  saveEntry,
  deleteEntry,
  deleteEntries,
  bulkUpdateField,
  type HistoryEntry,
  type BulkFieldKey,
} from "@/lib/history";
import { UrlInputForm } from "@/components/UrlInputForm";
import { TextInputForm } from "@/components/TextInputForm";
import { JobEditor } from "@/components/JobEditor";
import { JobPreview, type JobPreviewHandle } from "@/components/JobPreview";
import { HistoryPanel } from "@/components/HistoryPanel";

type Mode = "url" | "text";

export default function Home() {
  const [mode, setMode] = useState<Mode>("url");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [job, setJob] = useState<JobPosting | null>(null);
  const [sources, setSources] = useState<ExtractResponse["sources"]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [savedNote, setSavedNote] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [storageMode, setStorageMode] = useState<"server" | "local">("local");
  const previewRef = useRef<JobPreviewHandle>(null);

  // 初回に履歴を読み込み、一覧ページから指定された求人票があれば開く
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { entries, mode } = await loadHistory();
      if (cancelled) return;
      setHistory(entries);
      setStorageMode(mode);
      const pendingId = window.sessionStorage.getItem("let-recruit-open-id");
      if (pendingId) {
        window.sessionStorage.removeItem("let-recruit-open-id");
        const entry = entries.find((e) => e.id === pendingId);
        if (entry) {
          setJob(entry.job);
          setActiveId(entry.id);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
=======
import { useState } from "react";
import { Download, AlertCircle } from "lucide-react";
import type { ExtractResponse, JobPosting } from "@/lib/types";
import { LET_COMPANY } from "@/lib/company";
import { letMarkSvg } from "@/lib/logo";
import { requestExtract, downloadPdf } from "@/lib/client";
import { UrlInputForm } from "@/components/UrlInputForm";
import { JobEditor } from "@/components/JobEditor";
import { JobPreview } from "@/components/JobPreview";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState("");
  const [job, setJob] = useState<JobPosting | null>(null);
  const [sources, setSources] = useState<ExtractResponse["sources"]>([]);
>>>>>>> claude/evaluation-finance-dashboard-50w8t9

  async function handleExtract(urls: string[]) {
    setLoading(true);
    setError("");
    try {
      const res = await requestExtract(urls);
      setJob(res.job);
      setSources(res.sources);
<<<<<<< HEAD
      setActiveId(null); // 新規生成なので未保存扱い
=======
>>>>>>> claude/evaluation-finance-dashboard-50w8t9
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました。");
    } finally {
      setLoading(false);
    }
  }

<<<<<<< HEAD
  async function handleText(text: string) {
    setLoading(true);
    setError("");
    try {
      const res = await requestFromText(text);
      setJob(res.job);
      setSources(res.sources);
      setActiveId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました。");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!job) return;
    const wasUpdate = Boolean(activeId);
    const { id, result } = await saveEntry(job, activeId, Date.now());
    setActiveId(id);
    setHistory(result.entries);
    setStorageMode(result.mode);
    setSavedNote(wasUpdate ? "更新しました" : "履歴に保存しました");
    window.setTimeout(() => setSavedNote(""), 2500);
  }

  function handleOpen(entry: HistoryEntry) {
    setJob(entry.job);
    setActiveId(entry.id);
    setSources([]);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id: string) {
    const { entries, mode } = await deleteEntry(id);
    setHistory(entries);
    setStorageMode(mode);
    if (id === activeId) setActiveId(null);
  }

  async function handleBulkDelete(ids: string[]) {
    const { entries, mode } = await deleteEntries(ids);
    setHistory(entries);
    setStorageMode(mode);
    if (activeId && ids.includes(activeId)) setActiveId(null);
  }

  function handleBulkPrint(ids: string[]) {
    const jobs = history
      .filter((e) => ids.includes(e.id))
      .map((e) => e.job);
    if (jobs.length === 0) return;
    try {
      printCombined(buildCombinedHtml(jobs, LET_COMPANY));
    } catch (e) {
      setError(e instanceof Error ? e.message : "印刷に失敗しました。");
    }
  }

  async function handleBulkUpdate(
    ids: string[],
    field: BulkFieldKey,
    value: string,
    mode: "overwrite" | "fillEmpty",
  ) {
    const { entries, mode: sm } = await bulkUpdateField(
      ids,
      field,
      value,
      mode,
      Date.now(),
    );
    setHistory(entries);
    setStorageMode(sm);
    if (activeId && ids.includes(activeId)) {
      const updated = entries.find((e) => e.id === activeId);
      if (updated) setJob(updated.job);
    }
  }

  function handleNewBlank() {
    setJob(emptyJobPosting());
    setActiveId(null);
    setSources([]);
    setError("");
  }

  return (
    <main className="mx-auto max-w-[1280px] px-6 py-12 md:px-10">
      <Header />
      <div className="mt-10 flex flex-wrap items-center gap-2">
        <ModeTab active={mode === "url"} onClick={() => setMode("url")}>
          他社URLから作る
        </ModeTab>
        <ModeTab active={mode === "text"} onClick={() => setMode("text")}>
          テキストから整理する
        </ModeTab>
        <button
          onClick={handleNewBlank}
          className="ml-auto inline-flex items-center gap-2 rounded-full border border-border-soft bg-white px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-ink"
        >
          <FilePlus className="h-4 w-4" />
          空から作る
        </button>
      </div>
      <section className="mt-3 rounded-3xl border border-border-soft bg-surface p-6 md:p-8">
        {mode === "url" ? (
          <UrlInputForm loading={loading} onSubmit={handleExtract} />
        ) : (
          <TextInputForm loading={loading} onSubmit={handleText} />
        )}
=======
  async function handleDownload() {
    if (!job) return;
    setPdfLoading(true);
    setError("");
    try {
      await downloadPdf(job);
    } catch (e) {
      setError(e instanceof Error ? e.message : "PDF生成に失敗しました。");
    } finally {
      setPdfLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-[1280px] px-6 py-12 md:px-10">
      <Header />
      <section className="mt-10 rounded-3xl border border-border-soft bg-surface p-6 md:p-8">
        <UrlInputForm loading={loading} onSubmit={handleExtract} />
>>>>>>> claude/evaluation-finance-dashboard-50w8t9
      </section>

      {error && (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-[#ed315d] bg-white px-4 py-3 text-sm text-[#ed315d]">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {sources.length > 0 && <SourceList sources={sources} />}

<<<<<<< HEAD
      {history.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setHistoryOpen((v) => !v)}
              className="inline-flex items-center gap-2 rounded-full border border-border-soft bg-white px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-ink"
            >
              {historyOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <Clock className="h-4 w-4" />
              保存した求人票（{history.length}件）
            </button>
            <Link
              href="/history"
              className="inline-flex items-center gap-2 rounded-full border border-border-soft bg-white px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-ink"
            >
              <ListFilter className="h-4 w-4" />
              一覧ページで開く
            </Link>
            <span
              className={`ml-auto rounded-full px-3 py-1 text-xs font-semibold ${
                storageMode === "server"
                  ? "bg-[#e6f4f0] text-[#0fa388]"
                  : "bg-surface text-[#9ca3af]"
              }`}
            >
              {storageMode === "server"
                ? "チーム共有中"
                : "このブラウザのみ"}
            </span>
          </div>
          {historyOpen && (
            <HistoryPanel
              entries={history}
              activeId={activeId}
              onOpen={handleOpen}
              onDelete={handleDelete}
              onBulkPrint={handleBulkPrint}
              onBulkUpdate={handleBulkUpdate}
              onBulkDelete={handleBulkDelete}
            />
          )}
        </div>
      )}

=======
>>>>>>> claude/evaluation-finance-dashboard-50w8t9
      {job && (
        <section className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[420px_1fr]">
          <div className="grow-in">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold tracking-[0.06em] text-brand-dark">
                [ STEP 02 ] 内容を確認・編集
              </h2>
<<<<<<< HEAD
              <div className="flex items-center gap-2">
                {savedNote && (
                  <span className="text-xs font-medium text-[#0fa388]">
                    {savedNote}
                  </span>
                )}
                <button
                  onClick={handleSave}
                  className="inline-flex items-center gap-2 rounded-full border border-ink bg-white px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-ink hover:text-cream"
                >
                  <Save className="h-4 w-4" />
                  {activeId ? "上書き保存" : "履歴に保存"}
                </button>
              </div>
=======
>>>>>>> claude/evaluation-finance-dashboard-50w8t9
            </div>
            <JobEditor job={job} onChange={setJob} />
          </div>

          <div className="grow-in">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold tracking-[0.06em] text-brand-dark">
                [ STEP 03 ] プレビュー & 出力
              </h2>
              <button
<<<<<<< HEAD
                onClick={() => previewRef.current?.print()}
                className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-cream transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand"
              >
                <Printer className="h-4 w-4" />
                PDFで保存・印刷
              </button>
            </div>
            <p className="mb-4 rounded-xl border border-border-soft bg-surface px-4 py-3 text-xs leading-relaxed text-[#9ca3af]">
              「PDFで保存・印刷」を押すと印刷画面が開きます。送信先（プリンタ）で
              <span className="font-semibold text-ink">「PDFに保存」</span>
              を選ぶと、求人票をPDFファイルとして保存できます。
            </p>
            <JobPreview ref={previewRef} job={job} company={LET_COMPANY} />
=======
                onClick={handleDownload}
                disabled={pdfLoading}
                className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-cream transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand disabled:opacity-40"
              >
                <Download className="h-4 w-4" />
                {pdfLoading ? "生成中…" : "PDFダウンロード"}
              </button>
            </div>
            <JobPreview job={job} company={LET_COMPANY} />
>>>>>>> claude/evaluation-finance-dashboard-50w8t9
          </div>
        </section>
      )}
    </main>
  );
}

<<<<<<< HEAD
function ModeTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-300 ${
        active
          ? "bg-ink text-cream"
          : "border border-border-soft bg-white text-ink hover:border-ink"
      }`}
    >
      {children}
    </button>
  );
}

=======
>>>>>>> claude/evaluation-finance-dashboard-50w8t9
function Header() {
  return (
    <header className="border-b border-ink pb-6">
      <div className="flex items-center gap-3">
<<<<<<< HEAD
        <span className="text-xl font-bold tracking-[0.04em] text-brand">
          株式会社LET - 求人票様式
        </span>
=======
        <span
          className="text-brand"
          aria-hidden
          dangerouslySetInnerHTML={{ __html: letMarkSvg(30) }}
        />
        <span className="text-xl font-bold tracking-[0.06em] text-brand">
          LET inc.
        </span>
        <span className="text-xs tracking-[0.08em] text-ink">求人票ジェネレーター</span>
>>>>>>> claude/evaluation-finance-dashboard-50w8t9
      </div>
      <h1 className="mt-6 text-3xl font-bold leading-tight md:text-4xl">
        他社求人URLを貼るだけ。
        <br />
        <span className="text-brand">LETデザイン</span>の求人票へ。
      </h1>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink">
<<<<<<< HEAD
        参考にしたい求人ページのURLを貼り付けると、AIが内容を読み取り求人票に整理。
        作成した求人票は履歴に保存でき、後から再編集・PDF出力できます。
=======
        参考にしたい求人ページのURLを貼り付けると、AIが内容を読み取り1枚の求人票に統合。
        Web上で確認でき、そのままPDFとしても出力できます。
>>>>>>> claude/evaluation-finance-dashboard-50w8t9
      </p>
    </header>
  );
}

function SourceList({ sources }: { sources: ExtractResponse["sources"] }) {
  return (
    <ul className="mt-6 space-y-1.5">
      {sources.map((s) => (
        <li key={s.url} className="flex items-center gap-2 font-mono text-xs">
          <span className={s.fetched ? "text-[#0fa388]" : "text-[#ed315d]"}>
            {s.fetched ? "● 取得成功" : "○ 取得失敗"}
          </span>
          <span className="truncate text-[#9ca3af]">{s.url}</span>
          {s.note && <span className="text-[#ed315d]">({s.note})</span>}
        </li>
      ))}
    </ul>
  );
}
