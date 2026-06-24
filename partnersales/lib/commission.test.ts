import { describe, expect, it } from "vitest";
import {
  commissionsForDeal,
  computeAllCommissions,
  earningsByPartner,
  tierAmount,
} from "./commission";
import { uplineChain, downlineIds, indexById } from "./tree";
import { computeStats, supportQueue } from "./leaderboard";
import { deals, partners, services } from "@/data/seed";
import type { Deal, Service } from "./types";

const byId = indexById(partners);
const svc = (id: string): Service => services.find((s) => s.id === id)!;
const deal = (id: string): Deal => deals.find((d) => d.id === id)!;

describe("tierAmount", () => {
  it("percentage は金額×率を切り捨て", () => {
    expect(tierAmount({ tier: 1, type: "percentage", rate: 0.1 }, 1000000)).toBe(100000);
    expect(tierAmount({ tier: 3, type: "percentage", rate: 0.02 }, 12345)).toBe(246);
  });
  it("fixed は固定額", () => {
    expect(tierAmount({ tier: 1, type: "fixed", fixedAmount: 80000 }, 999999)).toBe(80000);
  });
});

describe("uplineChain（クライアントの上に最大3段）", () => {
  it("3段で打ち切り、4段上は含めない", () => {
    const chain = uplineChain("p-delta", byId, 3);
    expect(chain.map((p) => p.id)).toEqual(["p-delta", "p-blue", "p-acme"]);
  });
  it("ルート（弊社直接パートナー）は本人のみ＝tier1相当", () => {
    expect(uplineChain("p-acme", byId, 3).map((p) => p.id)).toEqual(["p-acme"]);
  });
});

describe("commissionsForDeal", () => {
  it("仕様例どおり 10% / 3% / 2% を3段に分配する", () => {
    const cs = commissionsForDeal(deal("d-001"), svc("svc-sns"), byId);
    expect(cs).toEqual([
      { dealId: "d-001", serviceId: "svc-sns", partnerId: "p-delta", tier: 1, amount: 100000, status: "confirmed" },
      { dealId: "d-001", serviceId: "svc-sns", partnerId: "p-blue", tier: 2, amount: 30000, status: "confirmed" },
      { dealId: "d-001", serviceId: "svc-sns", partnerId: "p-acme", tier: 3, amount: 20000, status: "confirmed" },
    ]);
  });

  it("4段目以降には分配しない（上は最大3ノード）", () => {
    const cs = commissionsForDeal(deal("d-001"), svc("svc-sns"), byId);
    expect(cs).toHaveLength(3);
    expect(cs.every((c) => c.tier <= 3)).toBe(true);
  });

  it("弊社の直接紹介者（ルート）が紹介すると tier1 のみ", () => {
    const d: Deal = { id: "t", serviceId: "svc-sns", clientName: "X", introducerPartnerId: "p-acme", amount: 1000000, status: "paid", closedAt: "2026-05-01" };
    const cs = commissionsForDeal(d, svc("svc-sns"), byId);
    expect(cs).toHaveLength(1);
    expect(cs[0]).toMatchObject({ partnerId: "p-acme", tier: 1, amount: 100000 });
  });

  it("自己成約は tier1 を出さず、上位の tier2/tier3 は支払う", () => {
    const cs = commissionsForDeal(deal("d-005"), svc("svc-sns"), byId);
    expect(cs.map((c) => [c.partnerId, c.tier, c.amount])).toEqual([
      ["p-blue", 2, 30000],
      ["p-acme", 3, 20000],
    ]);
    expect(cs.some((c) => c.partnerId === "p-delta")).toBe(false);
  });

  it("固定額プランも段ごとに分配する", () => {
    const cs = commissionsForDeal(deal("d-002"), svc("svc-web"), byId);
    expect(cs.map((c) => c.amount)).toEqual([80000, 30000, 10000]);
  });

  it("pending の成約は accrued（見込み）になる", () => {
    const cs = commissionsForDeal(deal("d-004"), svc("svc-sns"), byId);
    expect(cs.every((c) => c.status === "accrued")).toBe(true);
  });
});

describe("earningsByPartner", () => {
  it("確定と見込みを分けて集計する", () => {
    const all = computeAllCommissions(deals, services, partners);
    const e = earningsByPartner(all);
    const acme = e.get("p-acme")!;
    expect(acme.confirmed).toBeGreaterThan(0);
    const blue = e.get("p-blue")!;
    expect(blue.pending).toBeGreaterThan(0); // d-004(pending) の tier1
  });
});

describe("leaderboard / supportQueue", () => {
  const all = computeAllCommissions(deals, services, partners);
  const fixedNow = new Date("2026-06-20").getTime();
  const stats = computeStats(partners, deals, all, fixedNow);

  it("acme のダウンライン総売上は子孫の紹介成約を含む", () => {
    const acme = stats.find((s) => s.partner.id === "p-acme")!;
    expect(acme.downlineCount).toBe(downlineIds("p-acme", partners).size);
    expect(acme.totalSales).toBe(acme.ownSales + acme.downlineSales);
    expect(acme.downlineSales).toBeGreaterThan(0);
  });

  it("休眠パートナー zen はサポートキューに乗る", () => {
    const queue = supportQueue(stats);
    expect(queue.some((s) => s.partner.id === "p-zen")).toBe(true);
  });
});
