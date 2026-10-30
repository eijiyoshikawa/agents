"use client";

import { useActionState } from "react";
import { deleteMemberAction, importConfigMemberAction, reissuePasswordAction, toggleActiveAction, type RowActionState } from "./actions";

const INIT: RowActionState = { ok: false, message: "" };

/** 操作の結果。初期パスワードを発行したときは 1 回だけ表示する。end: 表の操作列用（PC では右寄せ） */
function PasswordBox({ state, end }: { state: RowActionState; end?: boolean }) {
  if (!state.message) return null;
  const box = (
    <div role="status" className={`mt-2 text-left ${end ? "max-w-[18rem] lg:ml-auto" : "max-w-md"} ${state.initialPassword ? "alert-watch" : `text-xs ${state.ok ? "text-good-ink" : "text-risk-ink"}`}`}>
      <div className={state.initialPassword ? "font-semibold text-watch-ink" : undefined}>{state.message}</div>
      {state.initialPassword && (
        <>
          <div className="mt-2 break-all font-mono text-base tracking-wider">{state.initialPassword}</div>
          <div className="mt-1 text-xs text-watch-ink">ログイン ID: {state.email}。この画面を閉じると再表示できません。本人に安全な方法で伝えてください</div>
        </>
      )}
    </div>
  );
  // 横並びの行の中では、次の行に改めて出す
  return end ? box : <div className="basis-full">{box}</div>;
}

/** 登録メンバー 1 行分の操作: 編集・無効化・パスワード再発行・削除（PC では 1 行に並べ、結果はボタンの下に出す） */
export function MemberRowActions({ email, name, active, isSelf }: { email: string; name: string; active: boolean; isSelf: boolean }) {
  const [reissue, reissueAction, reissuing] = useActionState(reissuePasswordAction, INIT);
  const [del, deleteAction, deleting] = useActionState(deleteMemberAction, INIT);
  return (
    <div className="lg:min-w-max">
      <div className="flex flex-wrap items-center gap-1.5 lg:flex-nowrap lg:justify-end">
        <a href={`/admin/members?edit=${encodeURIComponent(email)}#member-form`} className="btn-ghost btn-sm">
          編集
        </a>
        <form action={toggleActiveAction} className="contents">
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="active" value={active ? "0" : "1"} />
          <button className="btn-ghost btn-sm" title={active ? "ログインできなくします（データは残ります）" : "ログインできるようにします"}>
            {active ? "無効化" : "再有効化"}
          </button>
        </form>
        <form action={reissueAction} className="contents">
          <input type="hidden" name="email" value={email} />
          <button disabled={reissuing} className="btn-ghost btn-sm" title="初期パスワードを作り直して 1 回だけ表示します">
            {reissuing ? "発行中…" : "パスワード再発行"}
          </button>
        </form>
        {!isSelf && (
          <form
            action={deleteAction}
            className="contents"
            onSubmit={(e) => {
              if (!window.confirm(`${name}（${email}）を完全に削除します。元に戻せません。\n一時的に止めるだけなら「無効化」を使ってください。削除しますか？`)) e.preventDefault();
            }}
          >
            <input type="hidden" name="email" value={email} />
            <button disabled={deleting} className="btn-ghost btn-sm btn-danger">
              {deleting ? "削除中…" : "削除"}
            </button>
          </form>
        )}
      </div>
      <PasswordBox state={reissue} end />
      <PasswordBox state={del} end />
    </div>
  );
}

/**
 * 設定ファイルの役員を DB に取り込んで編集可能にするボタン。
 * 取り込み済み（managed）でも同じ部品のまま「管理中」を表示する。取り込み直後の再描画で部品が入れ替わると、
 * 1 回しか出せない初期パスワードの表示が消えてしまうため。
 */
export function ImportConfigMember({ email, name, managed, enabled }: { email: string; name: string; managed: boolean; enabled: boolean }) {
  const [state, action, pending] = useActionState(importConfigMemberAction, INIT);
  // contents: 親の行（li）にそのまま並べ、初期パスワードの枠は次の行に全幅で出す
  return (
    <div className="contents">
      {managed ? (
        <>
          <span className="chip chip-good status">登録メンバーで管理中</span>
          <span className="text-xs text-ink-3">下の一覧から編集できます</span>
        </>
      ) : enabled ? (
        <form
          action={action}
          onSubmit={(e) => {
            if (!window.confirm(`${name} を登録メンバーに取り込みます。初期パスワードが新しく発行され（1 回だけ表示）、以後は一覧から編集・再発行・無効化できます。続けますか？`)) e.preventDefault();
          }}
        >
          <input type="hidden" name="email" value={email} />
          <button disabled={pending} className="btn-ghost" title="登録メンバーに取り込みます（初期パスワードを新しく発行し、1 回だけ表示します）">
            {pending ? "取り込み中…" : "編集できるようにする"}
          </button>
        </form>
      ) : null}
      <PasswordBox state={state} />
    </div>
  );
}
