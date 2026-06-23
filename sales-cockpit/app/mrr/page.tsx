import { getContracts } from "@/lib/data";
import { yen, num } from "@/lib/format";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const ACTIVE = new Set(["試用期間", "契約中", "更新待ち"]);

export default async function MrrPage() {
  const { contracts, errors } = await getContracts();
  const active = contracts.filter((c) => c.status && ACTIVE.has(c.status));

  const byRep = new Map<string, { mrr: number; count: number }>();
  for (const c of active) {
    const r = c.sRep ?? "未割当";
    const cur = byRep.get(r) ?? { mrr: 0, count: 0 };
    cur.mrr += c.monthly;
    cur.count += 1;
    byRep.set(r, cur);
  }
  const reps = [...byRep.entries()].map(([rep, v]) => ({ rep, ...v })).sort((a, b) => b.mrr - a.mrr);
  const totalMrr = reps.reduce((s, r) => s + r.mrr, 0);
  const rows = [...active].sort((a, b) => b.monthly - a.monthly);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink">MRR（担当者別）</h1>
        <p className="text-xs text-ink-muted mt-0.5">
          稼働中（試用期間・契約中・更新待ち）の契約の月額料金を S担当 別に集計。全社MRR {yen(totalMrr)}・{num(active.length)}契約。
        </p>
      </div>

      {errors.length > 0 && (
        <div className="card p-4 ring-accent-amber/30 bg-accent-amber/5 text-xs text-ink-soft">{errors.join(" / ")}</div>
      )}

      {/* 担当者別サマリ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {reps.map((r) => (
          <div key={r.rep} className="card p-4">
            <div className="text-xs font-medium text-ink-muted">{r.rep}</div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-brand">{yen(r.mrr)}</div>
            <div className="mt-0.5 text-xs text-ink-muted">{r.count} 契約</div>
          </div>
        ))}
      </div>

      {/* 契約一覧 */}
      <section className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-ink-muted border-b border-white/10">
              <th className="text-left font-medium px-4 py-2.5">契約名</th>
              <th className="text-left font-medium px-3 py-2.5">S担当</th>
              <th className="text-left font-medium px-3 py-2.5">ステータス</th>
              <th className="text-left font-medium px-3 py-2.5">種別</th>
              <th className="text-left font-medium px-3 py-2.5">開始日</th>
              <th className="text-right font-medium px-4 py-2.5">月額</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.03]">
                <td className="px-4 py-2.5 text-ink max-w-72 truncate">{c.name}</td>
                <td className="px-3 py-2.5 text-xs text-ink-soft">{c.sRep ?? "—"}</td>
                <td className="px-3 py-2.5 text-xs text-ink-soft">{c.status ?? "—"}</td>
                <td className="px-3 py-2.5 text-xs text-ink-soft">{c.kinds.join("・") || "—"}</td>
                <td className="px-3 py-2.5 text-xs text-ink-muted">{c.start?.slice(0, 10) ?? "—"}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{yen(c.monthly)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
