"use client";

import { useActionState } from "react";
import { changePasswordAction, type PasswordState } from "./actions";

export function PasswordForm({ forced }: { forced: boolean }) {
  const [state, action, pending] = useActionState<PasswordState, FormData>(changePasswordAction, { ok: false, message: "" });
  return (
    <form action={action} className="card p-6 space-y-3">
      {forced && !state.ok && <p className="text-sm text-amber-800">初回ログインのため、パスワードを変更してください。変更後に各ダッシュボードへ移動できます。</p>}
      <label className="block text-sm">
        <span className="text-ink/70">現在のパスワード</span>
        <input name="current" type="password" required autoComplete="current-password" className="mt-1 w-full rounded-lg border border-ink/15 bg-white px-3 py-2" />
      </label>
      <label className="block text-sm">
        <span className="text-ink/70">新しいパスワード（10 文字以上）</span>
        <input name="next" type="password" required minLength={10} autoComplete="new-password" className="mt-1 w-full rounded-lg border border-ink/15 bg-white px-3 py-2" />
      </label>
      <label className="block text-sm">
        <span className="text-ink/70">新しいパスワード（確認）</span>
        <input name="confirm" type="password" required minLength={10} autoComplete="new-password" className="mt-1 w-full rounded-lg border border-ink/15 bg-white px-3 py-2" />
      </label>
      <div className="flex items-center gap-3">
        <button disabled={pending} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50">
          {pending ? "変更中…" : "変更する"}
        </button>
        {state.message && <span className={`text-sm ${state.ok ? "text-emerald-700" : "text-red-700"}`}>{state.message}</span>}
      </div>
      {state.ok && (
        <a href="/api/auth/signout" className="inline-block text-sm underline">
          ログアウトして再ログインする
        </a>
      )}
    </form>
  );
}
