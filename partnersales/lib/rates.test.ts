import { describe, expect, it } from "vitest";
import { mergeRewards } from "./rates";
import { commissionsForDeal } from "./commission";
import { indexById } from "./tree";
import { partners, services } from "@/data/seed";
import type { Deal, Service, TierReward } from "./types";

const byId = indexById(partners);
const svcSns = services.find((s) => s.id === "svc-sns")!;

describe("mergeRewards", () => {
  it("上書きの段を優先し、無い段は既定を使う", () => {
    const base: TierReward[] = [
      { tier: 1, type: "percentage", rate: 0.1 },
      { tier: 2, type: "percentage", rate: 0.03 },
      { tier: 3, type: "percentage", rate: 0.02 },
    ];
    const override: TierReward[] = [{ tier: 1, type: "percentage", rate: 0.2 }];
    const merged = mergeRewards(base, override);
    expect(merged.find((r) => r.tier === 1)!.rate).toBe(0.2);
    expect(merged.find((r) => r.tier === 2)!.rate).toBe(0.03);
  });
});

describe("commissionsForDeal: 料率スナップショット", () => {
  const deal = (rewards?: TierReward[]): Deal => ({
    id: "d", serviceId: "svc-sns", clientName: "X", introducerPartnerId: "p-delta",
    amount: 1000000, status: "confirmed", closedAt: "2026-05-01", rewards,
  });

  it("スナップショットがあればサービス既定でなくそちらで計算する", () => {
    const snap: TierReward[] = [
      { tier: 1, type: "percentage", rate: 0.2 }, // 既定10%→20%
      { tier: 2, type: "percentage", rate: 0.03 },
      { tier: 3, type: "percentage", rate: 0.02 },
    ];
    const cs = commissionsForDeal(deal(snap), svcSns, byId);
    expect(cs.find((c) => c.tier === 1)!.amount).toBe(200000); // 20%
  });

  it("スナップショットが無ければサービス既定で計算する", () => {
    const cs = commissionsForDeal(deal(undefined), svcSns, byId);
    expect(cs.find((c) => c.tier === 1)!.amount).toBe(100000); // 既定10%
  });
});
