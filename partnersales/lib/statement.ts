// 報酬明細・月次締め
// 確定報酬を成約（deal.closedAt）の月で集計し、支払い明細書の元データを作る。
import type { Commission, Deal, Service } from "./types";

export interface StatementLine {
  /** YYYY-MM */
  month: string;
  dealId: string;
  clientName: string;
  serviceName: string;
  tier: number;
  amount: number;
  status: Commission["status"];
}

/** コミッションに成約・サービス情報を結合した明細行を作る */
export function statementLines(
  commissions: Commission[],
  deals: Deal[],
  services: Service[]
): StatementLine[] {
  const dealById = new Map(deals.map((d) => [d.id, d]));
  const serviceName = (id: string) => services.find((s) => s.id === id)?.name ?? id;
  return commissions
    .map((c) => {
      const deal = dealById.get(c.dealId);
      return {
        month: (deal?.closedAt ?? "").slice(0, 7),
        dealId: c.dealId,
        clientName: deal?.clientName ?? c.dealId,
        serviceName: serviceName(c.serviceId),
        tier: c.tier,
        amount: c.amount,
        status: c.status,
      };
    })
    .sort((a, b) => b.month.localeCompare(a.month));
}

/** 特定パートナーの明細行（新しい月順） */
export function statementForPartner(
  partnerId: string,
  commissions: Commission[],
  deals: Deal[],
  services: Service[]
): StatementLine[] {
  return statementLines(
    commissions.filter((c) => c.partnerId === partnerId),
    deals,
    services
  );
}

/** 月（YYYY-MM）ごとの確定報酬合計。pending(accrued) は除外 */
export function monthlyTotals(lines: StatementLine[]): { month: string; total: number }[] {
  const map = new Map<string, number>();
  for (const l of lines) {
    if (l.status === "accrued") continue;
    map.set(l.month, (map.get(l.month) ?? 0) + l.amount);
  }
  return [...map.entries()]
    .map(([month, total]) => ({ month, total }))
    .sort((a, b) => b.month.localeCompare(a.month));
}
