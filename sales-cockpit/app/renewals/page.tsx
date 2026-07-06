import { getContracts } from "@/lib/data";
import { yen } from "@/lib/format";
import RenewalsClient, { type RenewalRow } from "@/components/RenewalsClient";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const ACTIVE = new Set(["試用期間", "契約中", "更新待ち"]);

export default async function RenewalsPage() {
  const { contracts, errors } = await getContracts();
  const in30 = new Date(Date.now() + 30 * 86400000).toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });

  const active = contracts.filter((c) => c.status && ACTIVE.has(c.status));
  const rows: RenewalRow[] = active.map((c) => ({
    id: c.id,
    name: c.name,
    nextRenewal: c.nextRenewal,
    churnRisk: c.churnRisk,
    health: c.health,
    csRep: c.csRep,
    monthly: c.monthly,
  }));
  const soon = rows.filter((c) => c.nextRenewal && c.nextRenewal.slice(0, 10) <= in30).length;
  const highRisk = rows.filter((c) => c.churnRisk === "高").length;
  const atRiskMrr = rows.filter((c) => c.churnRisk === "高").reduce((s, c) => s + c.monthly, 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-ink">更新 / チャーンアラート</h1>
        <p className="text-xs text-ink-muted mt-0.5">
          稼働契約の更新予定・解約リスク。30日以内の更新 {soon} 件・解約リスク高 {highRisk} 件（影響MRR {yen(atRiskMrr)}）。列ヘッダーで並び替え可。
        </p>
      </div>

      {errors.length > 0 && (
        <div className="card p-4 ring-accent-amber/30 bg-accent-amber/5 text-xs text-ink-soft">{errors.join(" / ")}</div>
      )}

      <RenewalsClient rows={rows} soonDate={in30} />
    </div>
  );
}
