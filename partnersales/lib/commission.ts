// 報酬計算エンジン（純粋関数）
// 仕様: docs/SPEC.md §2.2
import type {
  Commission,
  CommissionStatus,
  Deal,
  Partner,
  Service,
  Tier,
  TierReward,
} from "./types";
import { indexById, uplineChain } from "./tree";

const MAX_TIERS = 3;

/** 1段分の報酬額を計算（円未満切り捨て） */
export function tierAmount(reward: TierReward, dealAmount: number): number {
  if (reward.type === "percentage") {
    return Math.floor(dealAmount * (reward.rate ?? 0));
  }
  return Math.floor(reward.fixedAmount ?? 0);
}

/** Deal ステータス → Commission ステータスへのマッピング（確定 / 見込みの2値） */
function commissionStatusOf(deal: Deal): CommissionStatus {
  // confirmed / paid（=クライアント入金済み）はどちらも「報酬確定」扱い
  return deal.status === "pending" ? "accrued" : "confirmed";
}

/**
 * 1件の成約から、クライアントの上位パートナーを最大3段たどってコミッションを生成する。
 * クライアントを底とし、紹介したパートナーから上へ chain[0]=tier1, [1]=tier2, [2]=tier3。
 * 4段目以降（4段上のパートナー）には分配しない。
 * 自己成約（isSelfDeal）の場合は tier1 を支払わない（上位 tier2 / tier3 は支払う）。
 * 該当段の報酬定義が無い／該当パートナーが居ない段はスキップ。
 */
export function commissionsForDeal(
  deal: Deal,
  service: Service,
  partnersById: Map<string, Partner>
): Commission[] {
  const chain = uplineChain(deal.introducerPartnerId, partnersById, MAX_TIERS);
  const status = commissionStatusOf(deal);
  // 成約時点のスナップショットがあればそれを使う（サービス既定の後からの変更に影響されない）
  const plan = deal.rewards && deal.rewards.length > 0 ? deal.rewards : service.rewards;
  const rewardByTier = new Map<Tier, TierReward>(plan.map((r) => [r.tier, r]));

  const result: Commission[] = [];
  chain.forEach((partner, idx) => {
    const tier = (idx + 1) as Tier;
    // 自己成約は tier1（本人＝顧客）への紹介報酬を出さない
    if (tier === 1 && deal.isSelfDeal) return;
    const reward = rewardByTier.get(tier);
    if (!reward) return;
    const amount = tierAmount(reward, deal.amount);
    if (amount <= 0) return;
    result.push({
      dealId: deal.id,
      serviceId: service.id,
      partnerId: partner.id,
      tier,
      amount,
      status,
    });
  });
  return result;
}

/** 全成約からコミッション一覧を生成する */
export function computeAllCommissions(
  deals: Deal[],
  services: Service[],
  partners: Partner[]
): Commission[] {
  const partnersById = indexById(partners);
  const serviceById = new Map(services.map((s) => [s.id, s]));
  return deals.flatMap((deal) => {
    const service = serviceById.get(deal.serviceId);
    if (!service) return [];
    return commissionsForDeal(deal, service, partnersById);
  });
}

export interface PartnerEarnings {
  partnerId: string;
  /** 確定報酬の合計（成約が confirmed / paid のもの） */
  confirmed: number;
  /** 見込み報酬の合計（成約が pending のもの） */
  pending: number;
  /** 段別の確定報酬内訳 */
  byTier: Record<Tier, number>;
}

/** パートナーごとに報酬を集計する */
export function earningsByPartner(
  commissions: Commission[]
): Map<string, PartnerEarnings> {
  const map = new Map<string, PartnerEarnings>();
  const ensure = (id: string): PartnerEarnings => {
    let e = map.get(id);
    if (!e) {
      e = {
        partnerId: id,
        confirmed: 0,
        pending: 0,
        byTier: { 1: 0, 2: 0, 3: 0 },
      };
      map.set(id, e);
    }
    return e;
  };

  for (const c of commissions) {
    const e = ensure(c.partnerId);
    if (c.status === "accrued") {
      e.pending += c.amount;
    } else {
      e.confirmed += c.amount;
      e.byTier[c.tier] += c.amount;
    }
  }
  return map;
}
