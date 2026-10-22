"use client";

import { useActionState } from "react";
import { deleteMemberAction, importConfigMemberAction, reissuePasswordAction, type RowActionState } from "./actions";

const INIT: RowActionState = { ok: false, message: "" };

function PasswordBox({ state }: { state: RowActionState }) {
  if (!state.message) return null;
  return (
    <div className={state.initialPassword ? "alert-watch mt-2" : `mt-2 text-xs ${state.ok ? "text-good-ink" : "text-risk-ink"}`}>
      <div className={state.initialPassword ? "font-semibold text-watch-ink" : undefined}>{state.message}</div>
      {state.initialPassword && (
        <>
          <div className="mt-2 font-mono text-base tracking-wider">{state.initialPassword}</div>
          <div className="mt-1 text-xs text-watch-ink">ログイン ID: {state.email}。この画面を閉じると再表示できません。本人に安全な方法で伝えてください</div>
        </>
      )}
    </div>
  );
}

/** 登録メンバー 1 行分の操作: パスワード再発行・削除（編集と無効化は page.tsx 側） */
export function MemberRowActions({ email, name, isSelf }: { email: string; name: string; isSelf: boolean }) {
  const [reissue, reissueAction, reissuing] = useActionState(reissuePasswordAction, INIT);
  const [del, deleteAction, deleting] = useActionState(deleteMemberAction, INIT);
  return (
    <div className="inline">
      <form action={reissueAction} className="inline ml-2">
        <input type="hidden" name="email" value={email} />
        <button disabled={reissuing} className="link text-xs" title="初期パスワードを作り直して 1 回だけ表示します">
          {reissuing ? "発行中…" : "パスワード再発行"}
        </button>
      </form>
      {!isSelf && (
        <form
          action={deleteAction}
          className="inline ml-2"
          onSubmit={(e) => {
            if (!window.confirm(`${name}（${email}）を完全に削除します。元に戻せません。\n一時的に止めるだけなら「無効化」を使ってください。削除しますか？`)) e.preventDefault();
          }}
        >
          <input type="hidden" name="email" value={email} />
          <button disabled={deleting} className="link text-xs text-risk-ink">
            {deleting ? "削除中…" : "削除"}
          </button>
        </form>
      )}
      <PasswordBox state={reissue} />
      <PasswordBox state={del} />
    </div>
  );
}

/** 設定ファイルの役員を DB に取り込んで編集可能にするボタン */
export function ImportConfigMember({ email, name }: { email: string; name: string }) {
  const [state, action, pending] = useActionState(importConfigMemberAction, INIT);
  return (
    <div className="inline">
      <form
        action={action}
        className="inline ml-2"
        onSubmit={(e) => {
          if (!window.confirm(`${name} を登録メンバーに取り込みます。初期パスワードが新しく発行され（1 回だけ表示）、以後は一覧から編集・再発行・無効化できます。続けますか？`)) e.preventDefault();
        }}
      >
        <input type="hidden" name="email" value={email} />
        <button disabled={pending} className="btn-ghost">
          {pending ? "取り込み中…" : "編集できるようにする（初期パスワード発行）"}
        </button>
      </form>
      <PasswordBox state={state} />
    </div>
  );
}
