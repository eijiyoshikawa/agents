import { describe, expect, it } from "vitest";
import {
  PAYOUT_THRESHOLD,
  computePayoutStates,
  payoutQueue,
  payoutStateFor,
} from "./payout";
import type { PartnerEarnings } from "./commission";
import type { Payout } from "./types";

const earn = (confirmed: number): PartnerEarnings => ({
  partnerId: "p",
  confirmed,
  pending: 0,
  paid: 0,
  byTier: { 1: 0, 2: 0, 3: 0 },
});

describe("payoutStateFor", () => {
  it("下限未満は below_threshold（繰越）", () => {
    const s = payoutStateFor("p", 30000, 0, 0);
    expect(s.unsettled).toBe(30000);
    expect(s.eligible).toBe(false);
    expect(s.phase).toBe("below_threshold");
  });

  it("下限(5万)到達で eligible（請求書発行依頼）", () => {
    const s = payoutStateFor("p", 50000, 0, 0);
    expect(s.eligible).toBe(true);
    expect(s.phase).toBe("eligible");
    expect(PAYOUT_THRESHOLD).toBe(50000);
  });

  it("請求書受領済みは invoiced（入金待ち）", () => {
    const s = payoutStateFor("p", 80000, 0, 80000);
    expect(s.unsettled).toBe(0);
    expect(s.phase).toBe("invoiced");
  });

  it("振込済みを差し引いた未精算で判定する", () => {
    // 確定12万のうち5万振込済み → 残7万が未精算 → 下限到達
    const s = payoutStateFor("p", 120000, 50000, 0);
    expect(s.unsettled).toBe(70000);
    expect(s.eligible).toBe(true);
  });
});

describe("computePayoutStates / payoutQueue", () => {
  it("earnings と payouts から全パートナーの状態を作る", () => {
    const earnings = new Map<string, PartnerEarnings>([
      ["p-a", { ...earn(60000), partnerId: "p-a" }],
      ["p-b", { ...earn(20000), partnerId: "p-b" }],
    ]);
    const payouts: Payout[] = [
      { id: "x", partnerId: "p-a", amount: 0, status: "paid" },
    ];
    const states = computePayoutStates(earnings, payouts);
    expect(states.get("p-a")!.phase).toBe("eligible");
    expect(states.get("p-b")!.phase).toBe("below_threshold");

    const queue = payoutQueue(states);
    expect(queue.map((s) => s.partnerId)).toEqual(["p-a"]);
  });
});
