// 料率の解決ユーティリティ
import type { TierReward } from "./types";

/**
 * サービス既定の料率に、上書き（パートナーの料率パターン等）を段ごとにマージする。
 * 上書きに存在する段はそちらを優先し、無い段は既定を使う。
 */
export function mergeRewards(base: TierReward[], override: TierReward[]): TierReward[] {
  const byTier = new Map<number, TierReward>();
  for (const r of base) byTier.set(r.tier, r);
  for (const o of override) byTier.set(o.tier, o);
  return [...byTier.values()].sort((a, b) => a.tier - b.tier);
}
