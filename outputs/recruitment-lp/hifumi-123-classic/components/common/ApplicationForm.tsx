"use client";

import { useState } from "react";

interface Props {
  accentClassName?: string;
  buttonClassName?: string;
  variant?: "modern" | "classic" | "pop";
}

export default function ApplicationForm({
  accentClassName = "focus:ring-slate-900 focus:border-slate-900",
  buttonClassName = "bg-slate-900 text-white hover:bg-slate-800",
  variant = "modern",
}: Props) {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const labelBase = variant === "pop" ? "block text-sm font-bold mb-2" : "block text-sm font-medium mb-2";
  const inputBase = `w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-base outline-none transition focus:ring-2 sm:px-4 sm:py-3 ${accentClassName}`;

  if (submitted) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
          <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-lg font-semibold">ご応募ありがとうございます</p>
        <p className="mt-2 text-sm text-slate-500">
          ※ これは提案デモ用のダミーフォームです。実際の送信は行われていません。
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className={labelBase} htmlFor="name">お名前</label>
        <input id="name" type="text" required className={inputBase} placeholder="山田 太郎" />
      </div>
      <div>
        <label className={labelBase} htmlFor="email">メールアドレス</label>
        <input id="email" type="email" required className={inputBase} placeholder="example@email.com" />
      </div>
      <div>
        <label className={labelBase} htmlFor="position">希望職種</label>
        <input id="position" type="text" required className={inputBase} placeholder="施工管理 / 建築設計 など" />
      </div>
      <div>
        <label className={labelBase} htmlFor="message">志望動機・自己PR</label>
        <textarea id="message" rows={5} className={inputBase} placeholder="これまでのご経験や、当社で実現したいことをお聞かせください" />
      </div>
      <button
        type="submit"
        className={`w-full rounded-md px-5 py-3.5 text-sm font-semibold transition sm:px-6 sm:py-4 sm:text-base ${buttonClassName}`}
      >
        応募する
      </button>
      <p className="text-center text-xs text-slate-400">
        ※ デモ用フォームです。実際の送信は行われません。
      </p>
    </form>
  );
}
