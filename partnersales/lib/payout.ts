// 支払い精算ロジック
// ルール（docs/SPEC.md）:
//   - 累計確定報酬が 5万円を超えるまでは支払わない（下限到達で支払対象）
//   - 支払いは弊社からの銀行振込のみ
//   - 紹介者が都度請求書を発行 → 請求書受領(invoiced) → 振込完了(paid)
import type { Payout } from "./types";
import type { PartnerEarnings } from "./commission";

/** 支払い下限。未精算の確定報酬がこの額に達するまで支払わない */
export const PAYOUT_THRESHOLD = 50000;

/** 支払い方法（表示用） */
export const PAYOUT_METHOD = "弊社からの銀行振込（紹介者が都度請求書を発行）";

export type PayoutPhase =
  | "below_threshold" // 下限未満（繰越）
  | "eligible" //        下限到達・請求書発行依頼
  | "invoiced"; //       請求書受領・入金待ち

export interface PayoutState {
  partnerId: string;
  /** 確定報酬の累計（payable + paid 相当の確定分） */
  confirmedTotal: number;
  /** 振込完了済みの累計 */
  paidOut: number;
  /** 請求書受領済み・未入金の累計 */
  invoicedAmount: number;
  /** 未精算（請求も振込もされていない確定報酬） */
  unsettled: number;
  /** 下限に到達し支払い対象か */
  eligible: boolean;
  phase: PayoutPhase;
}

/** payouts をパートナー別・ステータス別に合算 */
function sumPayouts(payouts: Payout[]) {
  const paid = new Map<string, number>();
  const invoiced = new Map<string, number>();
  for (const p of payouts) {
    const target = p.status === "paid" ? paid : invoiced;
    target.set(p.partnerId, (target.get(p.partnerId) ?? 0) + p.amount);
  }
  return { paid, invoiced };
}

/** 1パートナーの支払い状態を算出 */
export function payoutStateFor(
  partnerId: string,
  confirmedTotal: number,
  paidOut: number,
  invoicedAmount: number,
  threshold = PAYOUT_THRESHOLD
): PayoutState {
  const unsettled = Math.max(0, confirmedTotal - paidOut - invoicedAmount);
  const eligible = unsettled >= threshold;
  let phase: PayoutPhase;
  if (invoicedAmount > 0) {
    phase = "invoiced";
  } else if (eligible) {
    phase = "eligible";
  } else {
    phase = "below_threshold";
  }
  return { partnerId, confirmedTotal, paidOut, invoicedAmount, unsettled, eligible, phase };
}

/** 全パートナーの支払い状態を算出 */
export function computePayoutStates(
  earnings: Map<string, PartnerEarnings>,
  payouts: Payout[],
  threshold = PAYOUT_THRESHOLD
): Map<string, PayoutState> {
  const { paid, invoiced } = sumPayouts(payouts);
  const ids = new Set<string>([...earnings.keys(), ...payouts.map((p) => p.partnerId)]);
  const out = new Map<string, PayoutState>();
  for (const id of ids) {
    out.set(
      id,
      payoutStateFor(
        id,
        earnings.get(id)?.confirmed ?? 0,
        paid.get(id) ?? 0,
        invoiced.get(id) ?? 0,
        threshold
      )
    );
  }
  return out;
}

/** 支払い対象（下限到達で未請求）のパートナーを抽出 */
export function payoutQueue(states: Map<string, PayoutState>): PayoutState[] {
  return [...states.values()]
    .filter((s) => s.phase === "eligible")
    .sort((a, b) => b.unsettled - a.unsettled);
}
