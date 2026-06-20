// シードデータから派生した各種集計を1か所で組み立てる
import { computeAllCommissions, earningsByPartner } from "./commission";
import { computeStats, leaderboard, supportQueue, type PartnerStats } from "./leaderboard";
import { buildTree } from "./tree";
import type { NodeMetric } from "@/components/TreeView";
import { deals, partners, services } from "@/data/seed";

export function getModel() {
  const commissions = computeAllCommissions(deals, services, partners);
  const earnings = earningsByPartner(commissions);
  const stats = computeStats(partners, deals, commissions);

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
    partners,
    services,
    deals,
    commissions,
    earnings,
    stats,
    metrics,
    leaderboard: leaderboard(stats),
    supportQueue: supportQueue(stats),
    forest: buildTree(partners),
  };
}

export function statsFor(stats: PartnerStats[], partnerId: string) {
  return stats.find((s) => s.partner.id === partnerId);
}
