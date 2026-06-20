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
import type { Deal, Partner, Service } from "./types";

const byId = indexById(partners);
const svc = (id: string): Service => services.find((s) => s.id === id)!;

describe("tierAmount", () => {
  it("percentage は金額×率を切り捨て", () => {
    expect(tierAmount({ tier: 1, type: "percentage", rate: 0.15 }, 300000)).toBe(45000);
    expect(tierAmount({ tier: 3, type: "percentage", rate: 0.02 }, 12345)).toBe(246);
  });
  it("fixed は固定額", () => {
    expect(tierAmount({ tier: 1, type: "fixed", fixedAmount: 80000 }, 999999)).toBe(80000);
  });
});

describe("uplineChain", () => {
  it("最大3段で打ち切る", () => {
    const chain = uplineChain("p-delta", byId, 3);
    expect(chain.map((p) => p.id)).toEqual(["p-delta", "p-blue", "p-acme"]);
  });
  it("3段未満なら居る分だけ返す", () => {
    expect(uplineChain("p-blue", byId, 3).map((p) => p.id)).toEqual(["p-blue", "p-acme"]);
    expect(uplineChain("p-acme", byId, 3).map((p) => p.id)).toEqual(["p-acme"]);
  });
});

describe("commissionsForDeal", () => {
  it("3段すべてに分配する（percentage）", () => {
    const deal = deals.find((d) => d.id === "d-001")!;
    const cs = commissionsForDeal(deal, svc("svc-sns"), byId);
    expect(cs).toEqual([
      { dealId: "d-001", serviceId: "svc-sns", partnerId: "p-delta", tier: 1, amount: 45000, status: "paid" },
      { dealId: "d-001", serviceId: "svc-sns", partnerId: "p-blue", tier: 2, amount: 15000, status: "paid" },
      { dealId: "d-001", serviceId: "svc-sns", partnerId: "p-acme", tier: 3, amount: 6000, status: "paid" },
    ]);
  });

  it("4段目以降には分配しない（上は最大3ノード）", () => {
    const deal = deals.find((d) => d.id === "d-001")!;
    const cs = commissionsForDeal(deal, svc("svc-sns"), byId);
    expect(cs.every((c) => c.tier <= 3)).toBe(true);
    expect(cs).toHaveLength(3);
  });

  it("上位が居なければ居る段だけ生成（acme 自己成約は tier1 のみ）", () => {
    const deal = deals.find((d) => d.id === "d-005")!;
    const cs = commissionsForDeal(deal, svc("svc-web"), byId);
    expect(cs).toHaveLength(1);
    expect(cs[0]).toMatchObject({ partnerId: "p-acme", tier: 1, amount: 80000 });
  });

  it("pending の成約は accrued（見込み）になる", () => {
    const deal = deals.find((d) => d.id === "d-004")!;
    const cs = commissionsForDeal(deal, svc("svc-sns"), byId);
    expect(cs.every((c) => c.status === "accrued")).toBe(true);
  });

  it("該当段の報酬定義が無ければスキップ", () => {
    const partial: Service = { id: "x", name: "x", active: true, rewards: [{ tier: 1, type: "fixed", fixedAmount: 1000 }] };
    const deal: Deal = { id: "z", serviceId: "x", partnerId: "p-delta", amount: 100000, status: "paid", closedAt: "2026-05-01" };
    const cs = commissionsForDeal(deal, partial, byId);
    expect(cs).toHaveLength(1);
    expect(cs[0].tier).toBe(1);
  });
});

describe("earningsByPartner", () => {
  it("確定と見込みを分けて集計する", () => {
    const all = computeAllCommissions(deals, services, partners);
    const e = earningsByPartner(all);
    // acme は複数成約のツリー上位 + 自己成約で確定報酬が積み上がる
    const acme = e.get("p-acme")!;
    expect(acme.confirmed).toBeGreaterThan(0);
    // blue の pending（d-004）は見込みに入る
    const blue = e.get("p-blue")!;
    expect(blue.pending).toBeGreaterThan(0);
  });
});

describe("leaderboard / supportQueue", () => {
  const all = computeAllCommissions(deals, services, partners);
  const fixedNow = new Date("2026-06-20").getTime();
  const stats = computeStats(partners, deals, all, fixedNow);

  it("acme のダウンライン総売上は子孫成約を含む", () => {
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
