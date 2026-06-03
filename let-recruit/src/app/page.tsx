"use client";

import { useState } from "react";
import { Download, AlertCircle, Loader2 } from "lucide-react";
import type { ExtractResponse, JobPosting } from "@/lib/types";
import { LET_COMPANY } from "@/lib/company";
import { letMarkSvg } from "@/lib/logo";
import { requestExtract, requestFromText, downloadPdf } from "@/lib/client";
import { UrlInputForm } from "@/components/UrlInputForm";
import { TextInputForm } from "@/components/TextInputForm";
import { JobEditor } from "@/components/JobEditor";
import { JobPreview } from "@/components/JobPreview";

type Mode = "url" | "text";

export default function Home() {
  const [mode, setMode] = useState<Mode>("url");
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState("");
  const [job, setJob] = useState<JobPosting | null>(null);
  const [sources, setSources] = useState<ExtractResponse["sources"]>([]);

  async function handleExtract(urls: string[]) {
    setLoading(true);
    setError("");
    try {
      const res = await requestExtract(urls);
      setJob(res.job);
      setSources(res.sources);
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました。");
    } finally {
      setLoading(false);
    }
  }

  async function handleText(text: string) {
    setLoading(true);
    setError("");
    try {
      const res = await requestFromText(text);
      setJob(res.job);
      setSources(res.sources);
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました。");
    } finally {
      setLoading(false);
    }
  }

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
      <div className="mt-10 flex gap-2">
        <ModeTab active={mode === "url"} onClick={() => setMode("url")}>
          他社URLから作る
        </ModeTab>
        <ModeTab active={mode === "text"} onClick={() => setMode("text")}>
          テキストから整理する
        </ModeTab>
      </div>
      <section className="mt-3 rounded-3xl border border-border-soft bg-surface p-6 md:p-8">
        {mode === "url" ? (
          <UrlInputForm loading={loading} onSubmit={handleExtract} />
        ) : (
          <TextInputForm loading={loading} onSubmit={handleText} />
        )}
      </section>

      {error && (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-[#ed315d] bg-white px-4 py-3 text-sm text-[#ed315d]">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {sources.length > 0 && <SourceList sources={sources} />}

      {job && (
        <section className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[420px_1fr]">
          <div className="grow-in">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold tracking-[0.06em] text-brand-dark">
                [ STEP 02 ] 内容を確認・編集
              </h2>
            </div>
            <JobEditor job={job} onChange={setJob} />
          </div>

          <div className="grow-in">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold tracking-[0.06em] text-brand-dark">
                [ STEP 03 ] プレビュー & 出力
              </h2>
              <button
                onClick={handleDownload}
                disabled={pdfLoading}
                className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-cream transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand disabled:opacity-40"
              >
                <Download className="h-4 w-4" />
                {pdfLoading ? "生成中…" : "PDFダウンロード"}
              </button>
            </div>
            {pdfLoading && (
              <p className="mb-4 flex items-center gap-2 rounded-xl border border-border-soft bg-surface px-4 py-3 text-xs leading-relaxed text-[#9ca3af]">
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-brand" />
                PDFを生成しています。混雑時は出力まで3分ほどかかる場合がありますので、このままお待ちください。
              </p>
            )}
            <JobPreview job={job} company={LET_COMPANY} />
          </div>
        </section>
      )}
    </main>
  );
}

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

function Header() {
  return (
    <header className="border-b border-ink pb-6">
      <div className="flex items-center gap-3">
        <span
          className="text-brand"
          aria-hidden
          dangerouslySetInnerHTML={{ __html: letMarkSvg(30) }}
        />
        <span className="text-xl font-bold tracking-[0.06em] text-brand">
          LET inc.
        </span>
        <span className="text-xs tracking-[0.08em] text-ink">求人票ジェネレーター</span>
      </div>
      <h1 className="mt-6 text-3xl font-bold leading-tight md:text-4xl">
        他社求人URLを貼るだけ。
        <br />
        <span className="text-brand">LETデザイン</span>の求人票へ。
      </h1>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink">
        参考にしたい求人ページのURLを貼り付けると、AIが内容を読み取り1枚の求人票に統合。
        Web上で確認でき、そのままPDFとしても出力できます。
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
