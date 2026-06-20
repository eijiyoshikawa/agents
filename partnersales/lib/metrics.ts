// データソースから生データを取得し、各種集計を1か所で組み立てる。
import { computeAllCommissions, earningsByPartner } from "./commission";
import { computeStats, leaderboard, supportQueue, type PartnerStats } from "./leaderboard";
import { computePayoutStates, payoutQueue } from "./payout";
import { buildTree } from "./tree";
import { getDataSource } from "./db";
import type { NodeMetric } from "@/components/TreeView";

export async function getModel() {
  const ds = getDataSource();
  const [services, partners, deals, payouts] = await Promise.all([
    ds.getServices(),
    ds.getPartners(),
    ds.getDeals(),
    ds.getPayouts(),
  ]);

  const commissions = computeAllCommissions(deals, services, partners);
  const earnings = earningsByPartner(commissions);
  const stats = computeStats(partners, deals, commissions);
  const payoutStates = computePayoutStates(earnings, payouts);

  const metrics = new Map<string, NodeMetric>();
  for (const s of stats) {
    const e = earnings.get(s.partner.id);
    metrics.set(s.partner.id, {
      totalSales: s.totalSales,
      confirmed: e?.confirmed ?? 0,
      pending: e?.pending ?? 0,
      directReferrals: s.directReferrals,
    });
  }

  return {
    source: ds.name,
    partners,
    services,
    deals,
    payouts,
    commissions,
    earnings,
    stats,
    metrics,
    payoutStates,
    payoutQueue: payoutQueue(payoutStates),
    leaderboard: leaderboard(stats),
    supportQueue: supportQueue(stats),
    forest: buildTree(partners),
  };
}

export function statsFor(stats: PartnerStats[], partnerId: string) {
  return stats.find((s) => s.partner.id === partnerId);
}
