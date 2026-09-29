import Link from "next/link";
import clsx from "clsx";
import { dbConfigured, dbGetVisitList, VISIT_STATUSES } from "@/lib/db";
import { notionConfigured } from "@/lib/notion";
import { scoreTier } from "@/lib/priority";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DEFAULT_STATUSES = [...VISIT_STATUSES].filter((s) => s !== "アプローチ前");

export default async function VisitsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const area = (one(sp.area) ?? "").trim();
  const statuses = one(sp.statuses) ? (one(sp.statuses) as string).split(",") : DEFAULT_STATUSES;
  const noExpOnly = one(sp.noexp) === "1";
  const limit = Math.min(Math.max(Number(one(sp.limit) ?? "500") || 500, 1), 2000);
  const searched = one(sp.q) === "1";

  const ready = notionConfigured() || dbConfigured();
  const result = searched && ready && dbConfigured() ? await dbGetVisitList({ area, statuses, noExpOnly, limit }) : null;

  const exportQs = new URLSearchParams({
    ...(area ? { area } : {}),
    statuses: statuses.join(","),
    ...(noExpOnly ? { noexp: "1" } : {}),
    limit: String(limit),
  }).toString();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-ink">訪問アプローチ（Google My Maps連携）</h1>
        <p className="text-xs text-ink-muted mt-0.5">
          アポ獲得に至っていない企業をエリアで絞り、優先スコア順のCSVを書き出して My Maps に取り込みます。
        </p>
      </div>

      <form method="GET" className="card p-4 space-y-3">
        <input type="hidden" name="q" value="1" />
        <div className="flex flex-wrap gap-2 items-center">
          <input
            name="area"
            defaultValue={area}
            placeholder="エリア（例: 東京都 / 大阪市 / 世田谷）"
            className="px-3 py-2 rounded-lg bg-surface ring-1 ring-white/10 text-sm min-w-64 focus:outline-none focus:ring-brand-glow/50"
          />
          <select name="limit" defaultValue={String(limit)} className="px-3 py-2 rounded-lg bg-surface ring-1 ring-white/10 text-sm">
            <option value="200">上位200件</option>
            <option value="500">上位500件</option>
            <option value="1000">上位1,000件</option>
            <option value="2000">上位2,000件（My Maps上限）</option>
          </select>
          <label className="inline-flex items-center gap-1.5 text-sm text-ink-soft">
            <input type="checkbox" name="noexp" value="1" defaultChecked={noExpOnly} className="accent-teal-400" />
            未経験可求人のみ
          </label>
          <button type="submit" className="px-4 py-2 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand-soft">
            件数を確認
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {VISIT_STATUSES.map((s) => {
            const next = statuses.includes(s) ? statuses.filter((x) => x !== s) : [...statuses, s];
            const qs = new URLSearchParams({
              q: "1",
              ...(area ? { area } : {}),
              statuses: next.join(","),
              ...(noExpOnly ? { noexp: "1" } : {}),
              limit: String(limit),
            }).toString();
            return (
              <Link
                key={s}
                href={`/visits?${qs}`}
                className={clsx(
                  "px-2.5 py-1 rounded-full text-xs ring-1 transition-colors",
                  statuses.includes(s)
                    ? "bg-brand/20 text-brand-glow ring-brand/40"
                    : "bg-surface text-ink-muted ring-white/10 hover:text-ink",
                )}
              >
                {s}
              </Link>
            );
          })}
        </div>
        <p className="text-[11px] text-ink-muted">
          対象ステータス（クリックで切替）。既定は「接触したがアポに至っていない」全ステータス。「アプローチ前」（未架電）も追加できます。
        </p>
      </form>

      {result && (
        <div className="card p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-ink">
              該当 <span className="font-bold text-lg num">{result.total.toLocaleString()}</span> 社
              {result.total > limit && <span className="text-xs text-ink-muted">（うち優先スコア上位 {limit.toLocaleString()} 件を出力）</span>}
            </p>
            <a
              href={`/api/visit-export?${exportQs}`}
              className="px-4 py-2 rounded-lg bg-accent-teal/20 text-accent-teal ring-1 ring-accent-teal/30 text-sm font-semibold hover:bg-accent-teal/30"
            >
              📥 My Maps用CSVをダウンロード
            </a>
          </div>
          {result.rows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-400 border-b border-white/10">
                    <th className="text-left px-3 py-2">優先度</th>
                    <th className="text-left px-3 py-2">顧客名</th>
                    <th className="text-left px-3 py-2">住所</th>
                    <th className="text-left px-3 py-2">ステータス</th>
                    <th className="text-left px-3 py-2">未経験可</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.slice(0, 20).map((c) => {
                    const tier = scoreTier(c.priority);
                    return (
                      <tr key={c.id} className="border-b border-white/5">
                        <td className={clsx("px-3 py-1.5 text-xs font-bold whitespace-nowrap", tier.cls)}>{tier.label}</td>
                        <td className="px-3 py-1.5">
                          <a href={c.url} target="_blank" rel="noreferrer" className="text-ink hover:text-brand-glow">{c.name}</a>
                        </td>
                        <td className="px-3 py-1.5 text-xs text-ink-soft">{c.address ?? "—"}</td>
                        <td className="px-3 py-1.5 text-xs text-ink-soft whitespace-nowrap">{c.status}</td>
                        <td className="px-3 py-1.5 text-xs whitespace-nowrap">
                          {c.noExpJob === "あり" ? <span className="text-accent-teal font-semibold">あり</span> : <span className="text-ink-muted">{c.noExpJob ?? "—"}</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {result.rows.length > 20 && <p className="text-[11px] text-ink-muted mt-2 px-3">…プレビューは上位20件。全{result.rows.length}件はCSVに含まれます。</p>}
            </div>
          )}
        </div>
      )}

      <div className="card p-4 text-sm text-ink-soft space-y-2">
        <p className="font-semibold text-ink">📍 Google My Maps への取り込み手順（初回3分）</p>
        <ol className="list-decimal pl-5 space-y-1 text-xs">
          <li><a href="https://mymaps.google.com" target="_blank" rel="noreferrer" className="text-brand-glow underline">mymaps.google.com</a> で「新しい地図を作成」</li>
          <li>「インポート」からダウンロードしたCSVを選択</li>
          <li>目印を配置する列 →「<b>住所</b>」、マーカーのタイトル →「<b>顧客名</b>」を選択（住所から自動でピンが立ちます）</li>
          <li>レイヤの「個別スタイル」→「<b>ステータス</b>」列でグループ化するとピンが状態別に色分けされます</li>
          <li>スマホのGoogleマップアプリ →「保存済み」→「マイマップ」で外出先から閲覧。ピンをタップすると電話番号・優先スコア・Notionリンクが見られます</li>
        </ol>
        <p className="text-[11px] text-ink-muted">
          ※ My Mapsは1レイヤ最大2,000件・1地図10レイヤ。エリアごとにレイヤを分けるのがおすすめです。訪問結果はNotionのステータス更新で記録すれば、次回の書き出しから自動で反映（訪問済みが除外）されます。
        </p>
      </div>
    </div>
  );
}
