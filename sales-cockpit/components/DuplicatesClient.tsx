"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink } from "lucide-react";
import clsx from "clsx";

export type DupMember = {
  id: string;
  name: string;
  url: string;
  status: string | null;
  phone: string | null;
  isRep: string | null;
  confirm: string | null;
  callCount?: number | null;
  address?: string | null;
};
export type DupGroup = { reason: string; key: string; members: DupMember[] };

async function postJson(url: string, body: unknown): Promise<any> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return await res.json();
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "通信に失敗しました" };
  }
}

export default function DuplicatesClient({ groups }: { groups: DupGroup[] }) {
  return (
    <div className="space-y-4">
      <AutoMergePanel />
      {groups.length === 0 ? (
        <div className="card p-8 text-center text-sm text-ink-muted">重複候補は見つかりませんでした。</div>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <GroupCard key={g.key} group={g} />
          ))}
        </div>
      )}
    </div>
  );
}

/** 自動でまとめられる重複（1件を除いて手つかず・電話が食い違わない）を一括でまとめる */
function AutoMergePanel() {
  const router = useRouter();
  const [preview, setPreview] = useState<{ total: number; removable: number } | null>(null);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<{ merged: number; removed: number; skipped: { name: string; reason: string }[] }>({ merged: 0, removed: 0, skipped: [] });
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    postJson("/api/duplicates/auto-merge", { preview: true }).then((j) => (j.ok ? setPreview({ total: j.total, removable: j.removable }) : setErr(j.error ?? "")));
  }, []);

  const run = async () => {
    if (!preview || !window.confirm(`自動でまとめられる ${preview.total} 組（消す側 ${preview.removable} 件）をまとめます。消す側は Notion のゴミ箱に入ります（30日は戻せます）。よろしいですか？`)) return;
    setRunning(true);
    setErr("");
    const skip: string[] = [];
    let merged = 0;
    let removed = 0;
    const skipped: { name: string; reason: string }[] = [];
    for (let i = 0; i < 30; i++) {
      const j = await postJson("/api/duplicates/auto-merge", { skip });
      if (!j.ok) {
        setErr(j.error ?? "失敗しました");
        break;
      }
      merged += j.merged.length;
      removed += j.removed;
      for (const x of j.skipped) {
        skip.push(x.key);
        skipped.push({ name: x.name, reason: x.reason });
      }
      setLog({ merged, removed, skipped: [...skipped] });
      if (j.remaining === 0 || j.merged.length + j.skipped.length === 0) {
        setDone(true);
        break;
      }
    }
    setRunning(false);
    router.refresh();
  };

  return (
    <div className="card p-4 space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-sm font-semibold text-ink">自動でまとめられる重複</h2>
        <span className="text-xs text-ink-muted">
          {preview ? `${preview.total} 組（消す側 ${preview.removable} 件）` : err ? "" : "数えています…"}
        </span>
        <button
          onClick={run}
          disabled={running || !preview || preview.total === 0}
          className="px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-medium disabled:opacity-50"
        >
          {running ? "まとめています…" : "まとめる"}
        </button>
      </div>
      <p className="text-xs text-ink-muted">
        会社名が同じで、電話番号が食い違わず、1件を除いて手つかず（ステータス空・架電0・メモ空・架電/商談/契約の紐付けなし）のものだけをまとめます。
        残す側に足りない項目（電話・住所・URLなど）を写してから、消す側を Notion のゴミ箱に入れます。直前に Notion を読み直し、履歴が入っていたものは触りません。
      </p>
      {(log.merged > 0 || log.skipped.length > 0) && (
        <div className="text-xs text-ink-soft">
          {done ? "完了" : running ? "途中経過" : "中断"}: {log.merged} 組をまとめ、{log.removed} 件をゴミ箱に入れました。
          {log.skipped.length > 0 && (
            <details className="mt-1">
              <summary>触らなかった {log.skipped.length} 組（下の一覧から手で判断してください）</summary>
              <ul className="mt-1 space-y-0.5">
                {log.skipped.slice(0, 50).map((x, i) => (
                  <li key={i}>
                    {x.name}: {x.reason}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
      {err && <p className="text-xs text-accent-red">⚠ {err}</p>}
    </div>
  );
}

function GroupCard({ group }: { group: DupGroup }) {
  const router = useRouter();
  // 残す側の初期値: 架電数の多い方
  const [keep, setKeep] = useState(() => [...group.members].sort((a, b) => (b.callCount ?? 0) - (a.callCount ?? 0))[0]?.id);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [closed, setClosed] = useState(false);

  const merge = async () => {
    const removeIds = group.members.filter((m) => m.id !== keep).map((m) => m.id);
    const keepName = group.members.find((m) => m.id === keep)?.name;
    if (!window.confirm(`「${keepName}」を残して、ほかの ${removeIds.length} 件をまとめます（架電記録などの紐付け・メモは残す側へ移し、ほかは Notion のゴミ箱へ）。よろしいですか？`)) return;
    setBusy(true);
    setErr("");
    const j = await postJson("/api/duplicates/merge", { keepId: keep, removeIds });
    setBusy(false);
    if (!j.ok) return setErr(j.error ?? "まとめられませんでした");
    setMsg(`✓ まとめました（${j.removed}件をゴミ箱へ${j.copied?.length ? `・写した項目: ${j.copied.join("・")}` : ""}）`);
    setClosed(true);
    router.refresh();
  };

  const notDup = async () => {
    setBusy(true);
    setErr("");
    const j = await postJson("/api/duplicates/not-duplicate", { ids: group.members.map((m) => m.id) });
    setBusy(false);
    if (!j.ok) return setErr(j.error ?? "更新できませんでした");
    setMsg("✓ 別会社として候補から外しました");
    setClosed(true);
    router.refresh();
  };

  return (
    <div className={clsx("card p-4", closed && "opacity-60")}>
      <div className="text-xs text-ink-muted mb-2">
        {group.reason}が一致 ・ {group.members.length}件
      </div>
      <div className="space-y-2">
        {group.members.map((m) => (
          <label key={m.id} className="flex items-start gap-2 border-b border-white/[0.06] last:border-0 pb-2 cursor-pointer">
            <input type="radio" name={`keep-${group.key}`} checked={keep === m.id} onChange={() => setKeep(m.id)} disabled={busy || closed} className="mt-1" aria-label={`${m.name} を残す`} />
            <div className="min-w-0">
              <a href={m.url} target="_blank" rel="noreferrer" className="text-ink hover:text-brand-glow hover:underline inline-flex items-center gap-1">
                {m.name}
                <ExternalLink size={11} className="text-ink-muted" />
              </a>
              <div className="text-xs text-ink-muted">
                {[m.phone, m.address, m.status, m.isRep, m.callCount ? `架電${m.callCount}回` : null].filter(Boolean).join(" ・ ") || "—"}
                {keep === m.id && <span className="text-brand-glow"> ・残す</span>}
              </div>
            </div>
          </label>
        ))}
      </div>
      {msg ? (
        <p className="text-xs text-brand-glow mt-2">{msg}</p>
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button onClick={merge} disabled={busy || !keep} className="px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-medium disabled:opacity-50">
            1つにまとめる（選んだ方を残す）
          </button>
          <button onClick={notDup} disabled={busy} className="px-3 py-1.5 rounded-lg bg-white/10 text-ink text-xs disabled:opacity-50">
            別会社（重複ではない）
          </button>
          {err && <span className="text-xs text-accent-red">⚠ {err}</span>}
        </div>
      )}
    </div>
  );
}
