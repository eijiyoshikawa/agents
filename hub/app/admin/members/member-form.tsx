"use client";

import { useActionState, useState } from "react";
import { saveMemberAction, type MemberFormState } from "./actions";
import type { MemberRecord } from "@/lib/member-store";

/** ハブ上の権限。「すべてのサイト」を選んだときに見られる範囲と、メンバー管理ができるかを決める */
const ROLE_OPTIONS = [
  ["staff", "一般 — メンバー管理はできない"],
  ["manager", "管理職 — メンバー管理はできない（「すべて」のとき管理職向けサイトまで）"],
  ["exec", "役員 — メンバー管理ができる（「すべて」のとき全サイト）"],
] as const;

type DashboardOption = { key: string; title: string; minRole: string; parent?: string };

function SiteCheck({ d, on, disabled, onToggle, note, small, fill }: { d: DashboardOption; on: boolean; disabled: boolean; onToggle: () => void; note?: string; small?: boolean; fill?: boolean }) {
  return (
    <label
      className={`check rounded-md border px-3 py-2 transition-colors duration-300 ease-standard ${fill ? "h-full" : ""} ${small ? "text-xs" : "text-sm"} ${
        disabled ? "border-line opacity-50" : on ? "border-brand-ink/60 bg-brand/10" : "border-line hover:border-line-2"
      }`}
    >
      <input type="checkbox" name="allow" value={d.key} checked={on} disabled={disabled} onChange={onToggle} />
      <span className="min-w-0">
        <span className="block text-ink">{d.title}</span>
        <span className="block text-[11px] leading-4 text-ink-3">
          {d.key}
          {note && `・${note}`}
        </span>
      </span>
    </label>
  );
}

export function MemberForm({ dashboards, editing }: { dashboards: DashboardOption[]; editing?: MemberRecord }) {
  const [state, action, pending] = useActionState<MemberFormState, FormData>(saveMemberAction, { ok: false, message: "" });
  // 新規は「サイトを選ぶ」から始める（何も選ばずに全部入れてしまう事故を防ぐ）。編集は保存されている設定を初期値にする
  const [allowAll, setAllowAll] = useState<boolean>(Boolean(editing && editing.allow === null));
  const [checked, setChecked] = useState<Set<string>>(() => new Set(editing?.allow ?? []));
  const toggle = (key: string) => setChecked((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  });
  const selectAllSites = () => setChecked(new Set(dashboards.filter((d) => !d.parent).map((d) => d.key)));
  const clearSites = () => setChecked(new Set());

  return (
    <form action={action} className="card p-6 space-y-5" key={editing?.email ?? "new"}>
      <h2 className="font-semibold">{editing ? `メンバーを編集: ${editing.name}` : "メンバーを追加"}</h2>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-ink-2">メールアドレス（ログイン ID）</span>
          <input name="email" type="email" required defaultValue={editing?.email ?? ""} readOnly={Boolean(editing)} className="input" placeholder="taro.yamada@let-inc.net" />
        </label>
        <label className="block text-sm">
          <span className="text-ink-2">氏名</span>
          <input name="name" required defaultValue={editing?.name ?? ""} className="input" placeholder="山田 太郎" />
        </label>
      </div>

      <fieldset className="rounded-lg border border-line p-4">
        <legend className="px-1 text-sm font-semibold">ログインできるサイト</legend>
        <p className="text-xs text-ink-2">チェックしたサイトだけがハブに表示され、そのサイトの URL を直接開いたときも同じ判定で通します。</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {dashboards
            .filter((d) => !d.parent)
            .map((d) => {
              const children = dashboards.filter((c) => c.parent === d.key);
              const parentOn = !allowAll && checked.has(d.key);
              return (
                <div key={d.key} className={children.length ? "sm:col-span-2" : undefined}>
                  <SiteCheck d={d} on={parentOn} disabled={allowAll} onToggle={() => toggle(d.key)} fill={children.length === 0} />
                  {children.length > 0 && (
                    <div className="ml-6 mt-1.5 grid gap-1.5 sm:grid-cols-3">
                      {children.map((c) => (
                        <SiteCheck key={c.key} d={c} on={!allowAll && !parentOn && checked.has(c.key)} disabled={allowAll || parentOn} onToggle={() => toggle(c.key)} note={parentOn ? "全部門に含まれます" : undefined} small />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <button type="button" className="btn-ghost btn-sm" onClick={selectAllSites} disabled={allowAll}>
            全部チェック
          </button>
          <button type="button" className="btn-ghost btn-sm" onClick={clearSites} disabled={allowAll}>
            全部外す
          </button>
          {!allowAll && <span className="chip chip-muted tabular-nums">{checked.size} 件チェック</span>}
        </div>
        <label className="check mt-3 text-sm">
          <input type="checkbox" name="allow_all" value="1" checked={allowAll} onChange={(e) => setAllowAll(e.target.checked)} />
          <span>すべてのサイト（下の「権限」で見られるサイト全部。今後サイトが増えたときも自動で追加）</span>
        </label>
      </fieldset>

      <label className="block text-sm">
        <span className="text-ink-2">権限（ハブでの役割）</span>
        <select name="role" defaultValue={editing?.role ?? "staff"} className="input">
          {ROLE_OPTIONS.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <span className="mt-1 block text-xs text-ink-3">サイトを個別にチェックした場合、ログインできるサイトはチェックが正です（権限は関係しません）。</span>
      </label>

      {editing && (
        <label className="check text-sm">
          <input type="checkbox" name="reset_password" value="1" />
          <span>パスワードを再発行する（本人には次回ログイン時に変更を求めます）</span>
        </label>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <button disabled={pending} className="btn-primary">
          {pending ? "保存中…" : editing ? "更新" : "追加して初期パスワードを発行"}
        </button>
        {state.message && <span className={`text-sm ${state.ok ? "text-good-ink" : "text-risk-ink"}`}>{state.message}</span>}
      </div>
      {state.initialPassword && (
        <div className="alert-watch">
          <div className="font-semibold text-watch-ink">初期パスワード（この画面を閉じると再表示できません。本人に安全な方法で伝えてください）</div>
          <div className="mt-2 break-all font-mono text-base tracking-wider">{state.initialPassword}</div>
          <div className="mt-1 text-xs text-watch-ink">ログイン ID: {state.email}。初回ログイン時にパスワード変更を求めます。</div>
        </div>
      )}
    </form>
  );
}
