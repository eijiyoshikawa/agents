"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Simple landing page that bootstraps an interview session.
 *
 * In real ops the interview row would be created in Notion ahead of time and
 * the candidate would just click a unique URL. For MVP testing we generate
 * an InterviewID (UUID) here and forward to /interview/[id]?job=...&candidate=...
 */

export default function HomePage() {
  const router = useRouter();
  const [jobId, setJobId] = useState("");
  const [name, setName] = useState("");

  const start = () => {
    if (!jobId.trim()) {
      window.alert("求人ページIDを入力してください");
      return;
    }
    const id = generateId();
    const params = new URLSearchParams({
      job: jobId.trim(),
      candidate: name.trim() || "ゲスト",
    });
    router.push(`/interview/${id}?${params}`);
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight">AI Interviewer</h1>
      <p className="mt-3 text-slate-600">
        マイクとカメラを使ったオンラインAI面接です。下記項目を入力して開始してください。
      </p>

      <div className="mt-8 space-y-4 rounded-2xl bg-white p-6 shadow-sm">
        <Field label="お名前 (任意)">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="山田 太郎"
            className="w-full rounded border border-slate-300 px-3 py-2"
          />
        </Field>
        <Field label="求人ページID (Notion)">
          <input
            type="text"
            value={jobId}
            onChange={(e) => setJobId(e.target.value)}
            placeholder="例: 1234abcd-..."
            className="w-full rounded border border-slate-300 px-3 py-2 font-mono text-sm"
          />
        </Field>
        <button
          type="button"
          onClick={start}
          className="w-full rounded-full bg-emerald-600 px-5 py-2.5 font-semibold text-white shadow-sm"
        >
          面接ルームへ進む
        </button>
      </div>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `iv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
