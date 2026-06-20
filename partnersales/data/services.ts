// サービス定義と報酬プラン
// ─────────────────────────────────────────────────────────────
// 【報酬率を後から追加・変更する場所はここです】
// 新しいサービスを増やす → services 配列に1要素追加するだけ。
// 報酬率を変える → 該当サービスの rewards を書き換えるだけ（ロジック側は不変）。
// v1 では本ファイルを Supabase テーブル + 管理画面に置き換える（構造はそのまま）。
// ─────────────────────────────────────────────────────────────
import type { Service, Tier, TierReward } from "@/lib/types";

/**
 * 標準の段別報酬テンプレート。
 * 報酬はクライアント契約額に対する割合。tier1=クライアントの直接紹介者、
 * tier2=その紹介者、tier3=さらに上の紹介者。4段目以降は分配しない。
 */
export const DEFAULT_TIER_RATES: { tier: Tier; rate: number }[] = [
  { tier: 1, rate: 0.1 }, // 10%
  { tier: 2, rate: 0.03 }, // 3%
  { tier: 3, rate: 0.02 }, // 2%
];

/** 割合ベースの報酬プランを生成（省略時は DEFAULT_TIER_RATES） */
export function percentagePlan(
  rates: { tier: Tier; rate: number }[] = DEFAULT_TIER_RATES
): TierReward[] {
  return rates.map((r) => ({ tier: r.tier, type: "percentage", rate: r.rate }));
}

/** 固定額ベースの報酬プランを生成 */
export function fixedPlan(
  amounts: { tier: Tier; fixedAmount: number }[]
): TierReward[] {
  return amounts.map((a) => ({
    tier: a.tier,
    type: "fixed",
    fixedAmount: a.fixedAmount,
  }));
}

export const services: Service[] = [
  {
    id: "svc-sns",
    name: "SNSマーケティング運用",
    description: "Instagram / TikTok / YouTube の運用代行",
    unitPrice: 1000000,
    active: true,
    // 報酬率を変えたい場合はここを percentagePlan([{tier:1,rate:0.12}, ...]) のように上書き
    rewards: percentagePlan(), // 10% / 3% / 2%
  },
  {
    id: "svc-bpo",
    name: "不動産BPO",
    description: "不動産業界特化型のBPOパッケージ",
    unitPrice: 500000,
    active: true,
    rewards: percentagePlan([
      { tier: 1, rate: 0.1 },
      { tier: 2, rate: 0.04 },
      { tier: 3, rate: 0.02 },
    ]),
  },
  {
    id: "svc-web",
    name: "LP・Web制作",
    description: "Next.js による高速LP・コーポレートサイト制作",
    unitPrice: 800000,
    active: true,
    // 固定額の報酬プランの例
    rewards: fixedPlan([
      { tier: 1, fixedAmount: 80000 },
      { tier: 2, fixedAmount: 30000 },
      { tier: 3, fixedAmount: 10000 },
    ]),
  },
];
