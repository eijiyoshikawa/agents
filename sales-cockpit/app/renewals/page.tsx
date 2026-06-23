import { getContracts } from "@/lib/data";
import { yen, num } from "@/lib/format";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const ACTIVE = new Set(["試用期間", "契約中", "更新待ち"]);
const RISK_COLOR: Record<string, string> = {
  高: "text-accent-red font-medium",
  中: "text-accent-amber",
  低: "text-ink-muted",
};

export default async function RenewalsPage() {
  const { contracts, errors } = await getContracts();
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
  const in30 = new Date(Date.now() + 30 * 86400000).toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });

  const active = contracts.filter((c) => c.status && ACTIVE.has(c.status));
  // 並び: 次回更新日が近い順（無しは後ろ）
  const rows = [...active].sort((a, b) => (a.nextRenewal ?? "9999").localeCompare(b.nextRenewal ?? "9999"));
  const soon = rows.filter((c) => c.nextRenewal && c.nextRenewal.slice(0, 10) <= in30).length;
  const highRisk = rows.filter((c) => c.churnRisk === "高").length;
  const atRiskMrr = rows.filter((c) => c.churnRisk === "高").reduce((s, c) => s + c.monthly, 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-ink">更新 / チャーンアラート</h1>
        <p className="text-xs text-ink-muted mt-0.5">
          稼働契約の更新予定・解約リスク。30日以内の更新 {soon} 件・解約リスク高 {highRisk} 件（影響MRR {yen(atRiskMrr)}）。
        </p>
      </div>

      {errors.length > 0 && (
        <div className="card p-4 ring-accent-amber/30 bg-accent-amber/5 text-xs text-ink-soft">{errors.join(" / ")}</div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-ink-muted border-b border-white/10">
              <th className="text-left font-medium px-4 py-2.5">契約名</th>
              <th className="text-left font-medium px-3 py-2.5">次回更新日</th>
              <th className="text-left font-medium px-3 py-2.5">解約リスク</th>
              <th className="text-left font-medium px-3 py-2.5">健全性</th>
              <th className="text-left font-medium px-3 py-2.5">CS担当</th>
              <th className="text-right font-medium px-4 py-2.5">月額</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-ink-muted py-6 text-sm">対象がありません。</td>
              </tr>
            ) : (
              rows.map((c) => {
                const due = c.nextRenewal && c.nextRenewal.slice(0, 10) <= in30;
                return (
                  <tr key={c.id} className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.03]">
                    <td className="px-4 py-2.5 text-ink max-w-72 truncate">{c.name}</td>
                    <td className={`px-3 py-2.5 text-xs ${due ? "text-accent-red font-medium" : "text-ink-muted"}`}>
                      {c.nextRenewal?.slice(0, 10) ?? "—"}
                    </td>
                    <td className={`px-3 py-2.5 text-xs ${RISK_COLOR[c.churnRisk ?? ""] ?? "text-ink-muted"}`}>
                      {c.churnRisk ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-ink-soft">{c.health ?? "—"}</td>
                    <td className="px-3 py-2.5 text-xs text-ink-soft">{c.csRep ?? "—"}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{yen(c.monthly)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
