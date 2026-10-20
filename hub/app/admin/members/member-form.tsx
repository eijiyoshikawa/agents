"use client";

import { useActionState } from "react";
import { saveMemberAction, type MemberFormState } from "./actions";
import type { MemberRecord } from "@/lib/member-store";

const ROLE_OPTIONS = [
  ["staff", "一般（担当案件・運用画面）"],
  ["manager", "管理職（営業・人材・KPI）"],
  ["exec", "役員（すべて・メンバー管理）"],
] as const;

export function MemberForm({ dashboards, editing }: { dashboards: { key: string; title: string; minRole: string }[]; editing?: MemberRecord }) {
  const [state, action, pending] = useActionState<MemberFormState, FormData>(saveMemberAction, { ok: false, message: "" });
  const allowSet = new Set(editing?.allow ?? []);
  return (
    <form action={action} className="card p-6 space-y-4" key={editing?.email ?? "new"}>
      <h2 className="font-semibold">{editing ? `メンバーを編集: ${editing.name}` : "メンバーを追加"}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-ink-2">メールアドレス（ログイン ID）</span>
          <input name="email" type="email" required defaultValue={editing?.email ?? ""} readOnly={Boolean(editing)} className="input" />
        </label>
        <label className="block text-sm">
          <span className="text-ink-2">氏名</span>
          <input name="name" required defaultValue={editing?.name ?? ""} className="input" />
        </label>
        <label className="block text-sm">
          <span className="text-ink-2">役割</span>
          <select name="role" defaultValue={editing?.role ?? "staff"} className="input">
            {ROLE_OPTIONS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <div className="text-sm">
          <span className="text-ink-2">見られる項目</span>
          <div className="mt-1 flex flex-col gap-1">
            <label className="flex items-center gap-2">
              <input type="radio" name="allow_mode" value="all" defaultChecked={!editing || editing.allow === null} /> 役割で見られる項目すべて
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="allow_mode" value="some" defaultChecked={Boolean(editing && editing.allow !== null)} /> 選んだ項目だけ
            </label>
          </div>
        </div>
      </div>
      <fieldset className="rounded-lg border border-line p-3">
        <legend className="px-1 text-xs text-ink-2">項目（「選んだ項目だけ」のとき有効。役割の上限を超える項目は表示されません）</legend>
        <div className="grid gap-1 sm:grid-cols-2">
          {dashboards.map((d) => (
            <label key={d.key} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="allow" value={d.key} defaultChecked={allowSet.has(d.key)} /> {d.title} <span className="text-xs text-ink-3">({d.minRole}以上)</span>
            </label>
          ))}
        </div>
      </fieldset>
      {editing && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="reset_password" value="1" /> パスワードを再発行する（本人には次回ログイン時に変更を求めます）
        </label>
      )}
      <div className="flex items-center gap-3">
        <button disabled={pending} className="btn-primary">
          {pending ? "保存中…" : editing ? "更新" : "追加して初期パスワードを発行"}
        </button>
        {state.message && <span className={`text-sm ${state.ok ? "text-good-ink" : "text-risk-ink"}`}>{state.message}</span>}
      </div>
      {state.initialPassword && (
        <div className="alert-watch">
          <div className="font-semibold text-watch-ink">初期パスワード（この画面を閉じると再表示できません。本人に安全な方法で伝えてください）</div>
          <div className="mt-2 font-mono text-base tracking-wider">{state.initialPassword}</div>
          <div className="mt-1 text-xs text-watch-ink">ログイン ID: {state.email}。初回ログイン時にパスワード変更を求めます。</div>
        </div>
      )}
    </form>
  );
}
