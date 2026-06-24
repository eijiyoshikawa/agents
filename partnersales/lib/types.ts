// PartnerSales ドメインモデル
// 仕様: docs/SPEC.md

/** 報酬の段。tier1 = クライアント直接紹介者、tier2 = その1段上の紹介者（最大2段） */
export type Tier = 1 | 2;

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
  /** 適用する料率パターン。null ならサービス既定 */
  ratePlanId?: string | null;
}

/** 名前付きの料率パターン（サービス × 段の報酬を上書き） */
export interface RatePlan {
  id: string;
  name: string;
  /** サービスごとの上書き報酬 */
  rewards: { serviceId: string; reward: TierReward }[];
  /** このパターンを適用する紹介者（パートナー）ID */
  partnerIds: string[];
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
  /**
   * 成約時点の料率スナップショット。存在すればこれを使って報酬を計算する
   * （サービス既定の料率を後から変えても、この成約の報酬は変わらない）。
   * 未設定（旧データ）はサービス既定にフォールバック。
   */
  rewards?: TierReward[];
  /** 任意のメモ */
  note?: string;
}

/**
 * コミッション（報酬）の状態。成約の確定状況だけを表す内部値。
 * - accrued   … 見込み（成約が pending）
 * - confirmed … 確定（成約が confirmed / paid）。支払い対象の集計に含まれる
 * ※ 実際にパートナーへ支払ったかどうかは別概念で、Payout（invoiced/paid）で管理する。
 */
export type CommissionStatus = "accrued" | "confirmed";

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

export type PayoutStatus = "invoiced" | "paid";

/**
 * パートナーへの支払い精算レコード。
 * 支払いは弊社からの銀行振込のみ。紹介者が都度請求書を発行し、
 * 請求書受領（invoiced）→ 振込完了（paid）の順に進む。
 */
export interface Payout {
  id: string;
  partnerId: string;
  /** 支払金額（円） */
  amount: number;
  status: PayoutStatus;
  /** 請求書番号（紹介者発行） */
  invoiceNo?: string;
  invoicedAt?: string; // ISO date
  paidAt?: string; // ISO date
  note?: string;
}

/**
 * パートナーのログイン認証情報（弊社が事前発行 → スタッフが登録時に割り当て）。
 * パスワードはハッシュで保持し、平文は発行時の一覧（Notion 等）にのみ残す。
 */
export interface PartnerCredential {
  loginId: string;
  /** 紐付くパートナー。未割り当ての発行済みは null */
  partnerId: string | null;
  status: "unassigned" | "active" | "disabled";
  issuedAt: string;
  assignedAt?: string;
}
