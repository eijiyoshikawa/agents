"use client"

import { useState } from "react"
import Link from "next/link"

export function ApplicationForm({ jobId }: { jobId: string }) {
  const [message, setMessage] = useState("")
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle")
  const [errorMessage, setErrorMessage] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus("submitting")
    setErrorMessage("")

    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          ...(message.trim() && { message: message.trim() }),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setErrorMessage(data.error ?? "応募に失敗しました")
        setStatus("error")
        return
      }

      setStatus("success")
    } catch {
      setErrorMessage("通信エラーが発生しました。もう一度お試しください。")
      setStatus("error")
    }
  }

  if (status === "success") {
    return (
      <div className="mt-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-6 w-6 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 12.75l6 6 9-13.5"
            />
          </svg>
        </div>
        <h2 className="mt-4 text-lg font-semibold text-gray-900">
          応募が完了しました
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          企業からの連絡をお待ちください。応募状況はマイページから確認できます。
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href={`/jobs/${jobId}`}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            求人詳細に戻る
          </Link>
          <Link
            href="/mypage/applications"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            応募一覧を見る
          </Link>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <div>
        <label
          htmlFor="message"
          className="block text-sm font-medium text-gray-700"
        >
          メッセージ（任意）
        </label>
        <textarea
          id="message"
          rows={5}
          maxLength={2000}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="自己PRや志望動機をご記入ください"
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
        <p className="mt-1 text-xs text-gray-400">
          {message.length} / 2000 文字
        </p>
      </div>

      {status === "error" && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full rounded-lg bg-blue-600 px-6 py-3 text-base font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {status === "submitting" ? "送信中..." : "応募する"}
      </button>
    </form>
  )
}
