"use client";

import { useActionState } from "react";
import { changePasswordAction, type PasswordState } from "./actions";

export function PasswordForm({ forced }: { forced: boolean }) {
  const [state, action, pending] = useActionState<PasswordState, FormData>(changePasswordAction, { ok: false, message: "" });
  return (
    <form action={action} className="card p-6 space-y-3">
      {forced && !state.ok && <p className="text-sm text-watch-ink">初回ログインのため、パスワードを変更してください。変更後に各ダッシュボードへ移動できます。</p>}
      <label className="block text-sm">
        <span className="text-ink-2">現在のパスワード</span>
        <input name="current" type="password" required autoComplete="current-password" className="input" />
      </label>
      <label className="block text-sm">
        <span className="text-ink-2">新しいパスワード（10 文字以上）</span>
        <input name="next" type="password" required minLength={10} autoComplete="new-password" className="input" />
      </label>
      <label className="block text-sm">
        <span className="text-ink-2">新しいパスワード（確認）</span>
        <input name="confirm" type="password" required minLength={10} autoComplete="new-password" className="input" />
      </label>
      <div className="flex items-center gap-3">
        <button disabled={pending} className="btn-primary">
          {pending ? "変更中…" : "変更する"}
        </button>
        {state.message && <span className={`text-sm ${state.ok ? "text-good-ink" : "text-risk-ink"}`}>{state.message}</span>}
      </div>
      {state.ok && (
        <a href="/api/auth/signout" className="link inline-block text-sm">
          ログアウトして再ログインする
        </a>
      )}
    </form>
  );
}
