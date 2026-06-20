// PartnerSales ドメインモデル
// 仕様: docs/SPEC.md

/** 報酬の段。tier1 = 直接成約者、tier2 = 1段上の紹介者、tier3 = 2段上の紹介者 */
export type Tier = 1 | 2 | 3;

/** 報酬の与え方 */
export type RewardType = "percentage" | "fixed";

/** サービス × 段ごとの報酬定義 */
export interface TierReward {
  tier: Tier;
  type: RewardType;
  /** type === "percentage" のとき 0〜1 の割合（0.15 = 15%） */
  rate?: number;
  /** type === "fixed" のとき 1成約あたりの固定額（円） */
  fixedAmount?: number;
}

/** 弊社が販売する商材。サービスごとに3段分の報酬プランを持つ */
export interface Service {
  id: string;
  name: string;
  /** 表示用の説明 */
  description?: string;
  /** 標準的な単価（円）。見込み計算の参考値 */
  unitPrice?: number;
  /** tier1〜tier3 の報酬定義（最大3要素） */
  rewards: TierReward[];
  active: boolean;
}

/** 紹介会社。parentId で紹介ツリーを構成する（親 = 紹介元） */
export interface Partner {
  id: string;
  name: string;
  /** 個別ページ・招待リンク用のスラッグ（一意） */
  slug: string;
  /** 紹介元パートナー。null ならルート（自社が直接獲得） */
  parentId: string | null;
  /** 招待コード（このパートナーが配布する） */
  referralCode: string;
  /** 担当者・連絡先など */
  contact?: { person?: string; email?: string };
  joinedAt: string; // ISO date
  status: "active" | "dormant" | "suspended";
}

export type DealStatus = "pending" | "confirmed" | "paid";

/** クライアント契約（成約）。報酬はこの契約額を起点に計算する */
export interface Deal {
  id: string;
  serviceId: string;
  /** 契約したクライアント名（弊社=LET と契約した外部の顧客） */
  clientName: string;
  /**
   * このクライアントを紹介したパートナー（= tier1 の受領者）。
   * ここからツリーを最大3段上って tier2 / tier3 へ分配する。
   */
  introducerPartnerId: string;
  /** 契約金額（円）。報酬率はこの額に対して掛ける */
  amount: number;
  status: DealStatus;
  closedAt: string; // ISO date
  /**
   * 自己成約フラグ。パートナー自身が弊社と契約（自分が顧客）した場合 true。
   * true のとき tier1 は支払わない（上位の tier2 / tier3 は通常どおり支払う）。
   */
  isSelfDeal?: boolean;
  /** 任意のメモ */
  note?: string;
}

export type CommissionStatus = "accrued" | "payable" | "paid";

/** 1成約から派生した、特定パートナーへの報酬 */
export interface Commission {
  dealId: string;
  serviceId: string;
  /** 報酬を受け取るパートナー */
  partnerId: string;
  tier: Tier;
  amount: number;
  status: CommissionStatus;
}
