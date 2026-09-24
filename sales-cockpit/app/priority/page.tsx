import Link from "next/link";
import clsx from "clsx";
import { getPriorityList } from "@/lib/data";
import { scoreTier } from "@/lib/priority";
import type { PriorityMode } from "@/lib/db";
import CallButton from "@/components/CallButton";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** 住所から都道府県相当の短い表示を作る（登録住所は表記ゆれが多いため先頭を要約） */
function areaLabel(address: string | null, pref: string | null): string {
  if (pref) return pref;
  if (!address) return "—";
  const m = address.match(/(東京都|北海道|京都府|大阪府|.{2,3}県)/);
  return m ? m[1] : address.slice(0, 8);
}

export default async function PriorityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const mode: PriorityMode = one(sp.tab) === "follow" ? "follow" : "new";
  const pageN = Math.max(1, Number(one(sp.page) ?? "1") || 1);
  const noExpOnly = one(sp.noexp) === "1";
  const { rows, total, page, pageSize, scored, errors } = await getPriorityList(mode, pageN, noExpOnly);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const qs = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { tab: mode === "follow" ? "follow" : undefined, noexp: noExpOnly ? "1" : undefined, ...over };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const str = p.toString();
    return str ? `/priority?${str}` : "/priority";
  };

  const tabCls = (active: boolean) =>
    clsx(
      "px-3 py-1.5 rounded-lg text-sm font-medium ring-1 transition-colors",
      active ? "bg-brand text-white ring-brand" : "bg-surface text-ink-muted ring-white/10 hover:text-ink",
    );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-ink">優先アプローチ</h1>
        <p className="text-xs text-ink-muted mt-0.5">
          アポ実績分析に基づくスコア順。上から順に架電するのが最も効率的です（CIRCUS経由 +40 ／ 首都圏 +30 ／ 100–299名 +30 ほか）。
        </p>
      </div>

      {errors.length > 0 && (
        <div className="card p-4 ring-accent-amber/30 bg-accent-amber/5 text-xs text-ink-soft">{errors.join(" / ")}</div>
      )}

      {!scored && errors.length === 0 && total > 0 && (
        <div className="card p-4 ring-accent-amber/30 bg-accent-amber/5 text-xs text-ink-soft">
          スコアは次回のフル同期後に反映されます（それまでは暫定の並びです）。
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2 flex-wrap">
          <Link href={qs({ tab: undefined, page: undefined })} className={tabCls(mode === "new")}>新規（未架電）</Link>
          <Link href={qs({ tab: "follow", page: undefined })} className={tabCls(mode === "follow")}>追客（再コール・資料請求・不在）</Link>
          <Link
            href={qs({ noexp: noExpOnly ? undefined : "1", page: undefined })}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-sm font-medium ring-1 transition-colors",
              noExpOnly ? "bg-accent-teal/20 text-accent-teal ring-accent-teal/30" : "bg-surface text-ink-muted ring-white/10 hover:text-ink",
            )}
          >
            未経験可求人のみ
          </Link>
        </div>
        <p className="text-xs text-ink-muted">{total.toLocaleString()} 社</p>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-slate-400 border-b border-white/10">
              <th className="text-right px-3 py-2.5">#</th>
              <th className="text-left px-3 py-2.5">優先度</th>
              <th className="text-left px-4 py-2.5">顧客名</th>
              <th className="text-left px-3 py-2.5">エリア</th>
              <th className="text-right px-3 py-2.5">従業員</th>
              <th className="text-left px-3 py-2.5">媒体</th>
              <th className="text-left px-3 py-2.5">見込み</th>
              <th className="text-left px-3 py-2.5">未経験可</th>
              {mode === "follow" && <th className="text-left px-3 py-2.5">状態</th>}
              <th className="text-left px-3 py-2.5">発信</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={10} className="px-4 py-8 text-center text-xs text-ink-muted">対象がありません</td></tr>
            )}
            {rows.map((c, i) => {
              const tier = scoreTier(c.priority);
              return (
                <tr key={c.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                  <td className="px-3 py-2 text-right text-xs text-ink-muted tabular-nums">
                    {(page - 1) * pageSize + i + 1}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={clsx("text-xs font-bold", tier.cls)}>{tier.label}</span>
                    {c.priority != null && <span className="ml-1.5 text-[11px] text-ink-muted tabular-nums">{c.priority}</span>}
                  </td>
                  <td className="px-4 py-2">
                    <a href={c.url} target="_blank" rel="noreferrer" className="text-ink hover:text-brand-glow font-medium">
                      {c.name}
                    </a>
                  </td>
                  <td className="px-3 py-2 text-xs text-ink-soft whitespace-nowrap">{areaLabel(c.address, c.pref)}</td>
                  <td className="px-3 py-2 text-right text-xs text-ink-soft tabular-nums">
                    {c.employees != null ? `${c.employees.toLocaleString()}名` : "—"}
                  </td>
                  <td className="px-3 py-2 text-xs text-ink-soft whitespace-nowrap">
                    {c.media.length > 0 ? c.media.join("・") : "—"}
                  </td>
                  <td className="px-3 py-2 text-xs text-ink-soft">{c.rank ?? "—"}</td>
                  <td className="px-3 py-2 text-xs whitespace-nowrap">
                    {c.noExpJob === "あり" ? <span className="text-accent-teal font-semibold">あり</span> : <span className="text-ink-muted">{c.noExpJob ?? "—"}</span>}
                  </td>
                  {mode === "follow" && <td className="px-3 py-2 text-xs text-ink-soft whitespace-nowrap">{c.status}</td>}
                  <td className="px-3 py-2 whitespace-nowrap"><CallButton phone={c.phone} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-center gap-3 text-sm">
        {page > 1 && (
          <Link
            href={qs({ page: String(page - 1) })}
            className="px-3 py-1.5 rounded-lg bg-surface ring-1 ring-white/10 text-ink-muted hover:text-ink"
          >
            ← 前へ
          </Link>
        )}
        <span className="text-xs text-ink-muted tabular-nums">{page} / {totalPages}</span>
        {page < totalPages && (
          <Link
            href={qs({ page: String(page + 1) })}
            className="px-3 py-1.5 rounded-lg bg-surface ring-1 ring-white/10 text-ink-muted hover:text-ink"
          >
            次へ →
          </Link>
        )}
      </div>
    </div>
  );
}
