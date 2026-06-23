import Link from "next/link";
import { getContracts } from "@/lib/data";
import { fetchCustomersByIds, fetchCustomerByName } from "@/lib/notion";
import { yen, num } from "@/lib/format";
import type { Customer } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const ACTIVE = new Set(["試用期間", "契約中", "更新待ち"]);

/** 契約名から会社名を抽出（「株式会社X｜契約」→「株式会社X」） */
function companyFromContract(name: string): string {
  return name.split(/[｜|]/)[0].trim();
}

export default async function MrrPage() {
  const { contracts, errors } = await getContracts();
  const active = contracts.filter((c) => c.status && ACTIVE.has(c.status));

  // 契約→顧客の紐付け（①relation ②同名フォールバック）
  const idMap = await fetchCustomersByIds(active.map((c) => c.customerId ?? "").filter(Boolean));
  const missing = active.filter((c) => !c.customerId || !idMap.has(c.customerId));
  const nameMap = new Map<string, Customer>(); // contractId -> customer
  await Promise.all(
    missing.map(async (ct) => {
      const cust = await fetchCustomerByName(companyFromContract(ct.name));
      if (cust) nameMap.set(ct.id, cust);
    }),
  );
  const custOf = (ctId: string, customerId: string | null): Customer | null =>
    (customerId ? idMap.get(customerId) : null) ?? nameMap.get(ctId) ?? null;

  // 集計（S担当 / IS担当）
  const byS = new Map<string, { mrr: number; count: number }>();
  const byIS = new Map<string, { mrr: number; count: number }>();
  for (const ct of active) {
    const s = ct.sRep ?? "未割当";
    const sv = byS.get(s) ?? { mrr: 0, count: 0 };
    sv.mrr += ct.monthly;
    sv.count += 1;
    byS.set(s, sv);
    const is = custOf(ct.id, ct.customerId)?.isRep ?? "未割当";
    const iv = byIS.get(is) ?? { mrr: 0, count: 0 };
    iv.mrr += ct.monthly;
    iv.count += 1;
    byIS.set(is, iv);
  }
  const toCards = (m: Map<string, { mrr: number; count: number }>) =>
    [...m.entries()].map(([rep, v]) => ({ rep, ...v })).sort((a, b) => b.mrr - a.mrr);
  const sCards = toCards(byS);
  const isCards = toCards(byIS);
  const totalMrr = active.reduce((s, c) => s + c.monthly, 0);
  const rows = [...active].sort((a, b) => b.monthly - a.monthly);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink">MRR（担当者別）</h1>
        <p className="text-xs text-ink-muted mt-0.5">
          稼働中（試用期間・契約中・更新待ち）の月額を集計。全社MRR {yen(totalMrr)}・{num(active.length)}契約。
        </p>
      </div>

      {errors.length > 0 && (
        <div className="card p-4 ring-accent-amber/30 bg-accent-amber/5 text-xs text-ink-soft">{errors.join(" / ")}</div>
      )}

      <RepCards title="S担当別 MRR" cards={sCards} />
      <RepCards title="IS担当別 MRR（契約→顧客の担当）" cards={isCards} />

      <section className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-ink-muted border-b border-white/10">
              <th className="text-left font-medium px-4 py-2.5">契約名</th>
              <th className="text-left font-medium px-3 py-2.5">S担当</th>
              <th className="text-left font-medium px-3 py-2.5">IS担当</th>
              <th className="text-left font-medium px-3 py-2.5">ステータス</th>
              <th className="text-left font-medium px-3 py-2.5">種別</th>
              <th className="text-left font-medium px-3 py-2.5">開始日</th>
              <th className="text-right font-medium px-4 py-2.5">月額</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const cust = custOf(c.id, c.customerId);
              return (
                <tr key={c.id} className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.03]">
                  <td className="px-4 py-2.5 text-ink max-w-72 truncate">
                    {cust ? (
                      <Link href={`/customer/${cust.id}`} className="hover:text-brand-glow hover:underline">
                        {c.name}
                      </Link>
                    ) : (
                      c.name
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-ink-soft">{c.sRep ?? "—"}</td>
                  <td className="px-3 py-2.5 text-xs text-ink-soft">{cust?.isRep ?? "—"}</td>
                  <td className="px-3 py-2.5 text-xs text-ink-soft">{c.status ?? "—"}</td>
                  <td className="px-3 py-2.5 text-xs text-ink-soft">{c.kinds.join("・") || "—"}</td>
                  <td className="px-3 py-2.5 text-xs text-ink-muted">{c.start?.slice(0, 10) ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{yen(c.monthly)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function RepCards({ title, cards }: { title: string; cards: { rep: string; mrr: number; count: number }[] }) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-ink mb-2">{title}</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((r) => (
          <div key={r.rep} className="card p-4">
            <div className="text-xs font-medium text-ink-muted">{r.rep}</div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-brand">{yen(r.mrr)}</div>
            <div className="mt-0.5 text-xs text-ink-muted">{r.count} 契約</div>
          </div>
        ))}
      </div>
    </section>
  );
}
