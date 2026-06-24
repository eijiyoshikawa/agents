// サービス定義と報酬プラン
// ─────────────────────────────────────────────────────────────
// 【報酬率を後から追加・変更する場所はここです】
// 新しいサービスを増やす → services 配列に1要素追加するだけ。
// 各サービスは「代理店（agency）」「トスアップ（tossup）」× tier1/tier2 の料率を持つ。
// 成約登録時にどちらの区分を使うか選ぶ（選んだ区分が tier1/tier2 に適用）。
// v1 では本ファイルを Supabase テーブル + 管理画面に置き換える（構造はそのまま）。
// ─────────────────────────────────────────────────────────────
import type { RewardPlanType, Service, Tier, TierReward } from "@/lib/types";

/** 標準の段別報酬テンプレート（代理店区分の既定）。最大2段。 */
export const DEFAULT_TIER_RATES: { tier: Tier; rate: number }[] = [
  { tier: 1, rate: 0.1 }, // 10%
  { tier: 2, rate: 0.03 }, // 3%
];

/** 割合ベースの報酬プランを生成（区分を付与） */
export function percentagePlan(
  rates: { tier: Tier; rate: number }[],
  planType: RewardPlanType = "agency"
): TierReward[] {
  return rates.map((r) => ({ tier: r.tier, type: "percentage", rate: r.rate, planType }));
}

/** 固定額ベースの報酬プランを生成（区分を付与） */
export function fixedPlan(
  amounts: { tier: Tier; fixedAmount: number }[],
  planType: RewardPlanType = "agency"
): TierReward[] {
  return amounts.map((a) => ({ tier: a.tier, type: "fixed", fixedAmount: a.fixedAmount, planType }));
}

export const services: Service[] = [
  {
    id: "svc-sns",
    name: "SNSマーケティング運用",
    description: "Instagram / TikTok / YouTube の運用代行",
    unitPrice: 1000000,
    active: true,
    rewards: [
      ...percentagePlan([{ tier: 1, rate: 0.1 }, { tier: 2, rate: 0.03 }], "agency"),
      ...percentagePlan([{ tier: 1, rate: 0.05 }, { tier: 2, rate: 0.02 }], "tossup"),
    ],
  },
  {
    id: "svc-bpo",
    name: "不動産BPO",
    description: "不動産業界特化型のBPOパッケージ",
    unitPrice: 500000,
    active: true,
    rewards: [
      ...percentagePlan([{ tier: 1, rate: 0.1 }, { tier: 2, rate: 0.04 }], "agency"),
      ...percentagePlan([{ tier: 1, rate: 0.05 }, { tier: 2, rate: 0.02 }], "tossup"),
    ],
  },
  {
    id: "svc-web",
    name: "LP・Web制作",
    description: "Next.js による高速LP・コーポレートサイト制作",
    unitPrice: 800000,
    active: true,
    rewards: [
      ...fixedPlan([{ tier: 1, fixedAmount: 80000 }, { tier: 2, fixedAmount: 30000 }], "agency"),
      ...fixedPlan([{ tier: 1, fixedAmount: 40000 }, { tier: 2, fixedAmount: 15000 }], "tossup"),
    ],
  },
];
