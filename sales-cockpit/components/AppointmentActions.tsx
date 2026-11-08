"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";

type Appt = { id: string; name: string; rep: string | null; scheduledAt: string | null; reschedules: number; customerId: string | null };
type Unlogged = { id: string; name: string; rep: string | null; obtainedOn: string };

const fmt = (iso: string | null) => {
  if (!iso) return "未入力";
  if (iso.length === 10) return `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))}`;
  const d = new Date(iso);
  return d.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
};

async function post(body: Record<string, unknown>): Promise<string | null> {
  try {
    const res = await fetch("/api/appointment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await res.json();
    return j.ok ? null : j.error || "記録に失敗しました";
  } catch (e: any) {
    return e?.message ?? "記録に失敗しました";
  }
}

export function AppointmentActions({ pending, missing, unlogged }: { pending: Appt[]; missing: Appt[]; unlogged: Unlogged[] }) {
  if (pending.length + missing.length + unlogged.length === 0) {
    return <p className="text-sm text-ink-muted py-4 text-center">未回答・未入力のアポはありません。</p>;
  }
  return (
    <div className="space-y-5">
      {pending.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-accent-amber mb-2">予定日を過ぎて結果が未回答（{pending.length}件）</h3>
          <div className="space-y-2">{pending.map((a) => <OutcomeRow key={a.id} a={a} />)}</div>
        </div>
      )}
      {missing.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-accent-amber mb-2">実施予定日時が未入力（{missing.length}件）</h3>
          <div className="space-y-2">{missing.map((a) => <ScheduleRow key={a.id} label={a.name} rep={a.rep} body={{ action: "schedule", id: a.id }} />)}</div>
        </div>
      )}
      {unlogged.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-accent-amber mb-2">アポ獲得したのにアポ管理に未登録（直近60日・{unlogged.length}件）</h3>
          <div className="space-y-2">
            {unlogged.map((c) => (
              <ScheduleRow key={c.id} label={`${c.name}（取得 ${fmt(c.obtainedOn)}）`} rep={c.rep} body={{ action: "create", customerId: c.id, customerName: c.name, obtainedOn: c.obtainedOn, rep: c.rep ?? undefined }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function OutcomeRow({ a }: { a: Appt }) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "reschedule">("idle");
  const [date, setDate] = useState("");
  const [memo, setMemo] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState("");

  const send = async (outcome: string) => {
    setBusy(true);
    setErr("");
    const e = await post({ action: "outcome", id: a.id, outcome, newDate: outcome === "リスケ" ? date : undefined, memo: memo || undefined });
    setBusy(false);
    if (e) return setErr(e);
    setDone(outcome);
    router.refresh();
  };

  return (
    <div className={clsx("rounded-lg bg-white/[0.04] ring-1 ring-white/10 p-3", done && "opacity-60")}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <a href={a.customerId ? `/customer/${a.customerId}` : "#"} className="font-medium text-ink hover:text-brand-glow hover:underline">{a.name}</a>
        <span className="text-xs text-ink-muted">予定 {fmt(a.scheduledAt)}・{a.rep ?? "担当未設定"}{a.reschedules ? `・リスケ${a.reschedules}回` : ""}</span>
        {a.reschedules >= 2 && <span className="text-xs text-accent-red">要注意（リスケ2回以上）</span>}
      </div>
      {done ? (
        <p className="text-xs text-brand-glow mt-2">✓ 「{done}」を記録しました</p>
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button disabled={busy} onClick={() => send("実施")} className="px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-medium disabled:opacity-50">実施した</button>
          <button disabled={busy} onClick={() => setMode(mode === "reschedule" ? "idle" : "reschedule")} className="px-3 py-1.5 rounded-lg bg-white/10 text-ink text-xs">リスケ</button>
          <button disabled={busy} onClick={() => send("キャンセル")} className="px-3 py-1.5 rounded-lg bg-white/10 text-ink text-xs">キャンセル</button>
          <button disabled={busy} onClick={() => send("先方不在")} className="px-3 py-1.5 rounded-lg bg-white/10 text-ink text-xs">先方不在</button>
          <input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="理由・メモ（任意）" className="flex-1 min-w-36 px-2.5 py-1.5 rounded-lg bg-night-1 ring-1 ring-white/10 text-xs" />
          {mode === "reschedule" && (
            <span className="flex items-center gap-2">
              <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} className="px-2.5 py-1.5 rounded-lg bg-night-1 ring-1 ring-white/10 text-xs" aria-label="新しい予定日時" />
              <button disabled={busy || !date} onClick={() => send("リスケ")} className="px-3 py-1.5 rounded-lg bg-accent-amber/80 text-night-0 text-xs font-medium disabled:opacity-50">新しい予定で記録</button>
            </span>
          )}
          {err && <span className="text-xs text-accent-red">⚠ {err}</span>}
        </div>
      )}
    </div>
  );
}

function ScheduleRow({ label, rep, body }: { label: string; rep: string | null; body: Record<string, unknown> }) {
  const router = useRouter();
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const save = async () => {
    setBusy(true);
    setErr("");
    const e = await post({ ...body, scheduledAt: date });
    setBusy(false);
    if (e) return setErr(e);
    setDone(true);
    router.refresh();
  };
  return (
    <div className={clsx("rounded-lg bg-white/[0.04] ring-1 ring-white/10 p-3 flex flex-wrap items-center gap-2", done && "opacity-60")}>
      <span className="text-sm text-ink">{label}</span>
      <span className="text-xs text-ink-muted">{rep ?? "担当未設定"}</span>
      {done ? (
        <span className="text-xs text-brand-glow">✓ 登録しました</span>
      ) : (
        <>
          <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} className="px-2.5 py-1.5 rounded-lg bg-night-1 ring-1 ring-white/10 text-xs" aria-label="実施予定日時" />
          <button disabled={busy || !date} onClick={save} className="px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-medium disabled:opacity-50">実施予定日時を登録</button>
          {err && <span className="text-xs text-accent-red">⚠ {err}</span>}
        </>
      )}
    </div>
  );
}
