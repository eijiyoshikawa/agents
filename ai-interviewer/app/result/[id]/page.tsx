import { notFound } from "next/navigation";
import { fetchInterviewById } from "@/lib/notion";
import { parseEvaluation } from "@/lib/evaluation";
import type { Turn } from "@/types/interview";

export const dynamic = "force-dynamic";

interface Props {
  params: { id: string };
}

export default async function ResultPage({ params }: Props) {
  const interview = await fetchInterviewById(params.id);
  if (!interview) notFound();

  const evaluation = safeEval(interview.evaluationJson);
  const turns = safeTurns(interview.transcriptJson);

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <header className="mb-8 border-b border-slate-200 pb-6">
        <h1 className="text-2xl font-bold tracking-tight">
          面接結果 — {interview.candidateName || "(候補者名未設定)"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          ID: <code>{params.id}</code>
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <Stat label="開始" value={fmt(interview.startedAt)} />
          <Stat label="終了" value={fmt(interview.endedAt)} />
          <Stat
            label="所要時間"
            value={
              interview.durationSec !== null
                ? `${Math.round(interview.durationSec / 60)}分`
                : "-"
            }
          />
          <Stat label="ステータス" value={interview.status ?? "-"} />
        </dl>
      </header>

      {evaluation ? (
        <section className="mb-10 rounded-xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">評価サマリー</h2>
            <span className="rounded-full bg-slate-900 px-3 py-1 text-sm text-white">
              総合 {evaluation.overall_score} / 5
            </span>
          </div>
          <p className="mt-4 text-sm">
            <strong>推奨：</strong>
            {evaluation.recommendation}
          </p>
          <p className="mt-2 text-sm">{evaluation.next_step_suggestion}</p>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <Bulleted title="強み" items={evaluation.strengths} />
            <Bulleted title="懸念点" items={evaluation.concerns} />
          </div>

          <div className="mt-6">
            <h3 className="mb-2 text-sm font-semibold">スキル評価</h3>
            <ul className="space-y-1 text-sm">
              {Object.entries(evaluation.skill_assessment).map(([k, v]) => (
                <li key={k} className="flex justify-between">
                  <span>{k}</span>
                  <span className="font-mono">{v} / 5</span>
                </li>
              ))}
            </ul>
          </div>

          {evaluation.key_quotes.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-2 text-sm font-semibold">印象的な発言</h3>
              <ul className="space-y-2 text-sm">
                {evaluation.key_quotes.map((q, i) => (
                  <li key={i} className="rounded bg-slate-50 p-3">
                    <div className="mb-1 text-xs uppercase tracking-wide text-slate-500">
                      {q.topic}
                    </div>
                    <div>{q.quote}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      ) : (
        <section className="mb-10 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
          評価データを読み込めませんでした。
        </section>
      )}

      <section className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">トランスクリプト</h2>
        {turns.length === 0 ? (
          <p className="text-sm text-slate-500">記録がありません。</p>
        ) : (
          <ol className="space-y-3 text-sm">
            {turns.map((t, i) => (
              <li key={i} className="rounded bg-slate-50 p-3">
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  {t.role === "interviewer" ? "面接官" : "候補者"}
                </div>
                <div className="mt-1 whitespace-pre-wrap">{t.content}</div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}

function Bulleted({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">記載なし</p>
      ) : (
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {items.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function fmt(iso: string | null): string {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("ja-JP");
  } catch {
    return iso;
  }
}

function safeEval(json: string) {
  try {
    return parseEvaluation(json);
  } catch {
    return null;
  }
}

function safeTurns(json: string): Turn[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? (parsed as Turn[]) : [];
  } catch {
    return [];
  }
}
