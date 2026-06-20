import { describe, expect, it } from "vitest";
import { monthlyTotals, statementForPartner } from "./statement";
import { computeAllCommissions } from "./commission";
import { deals, partners, services } from "@/data/seed";

describe("statementForPartner / monthlyTotals", () => {
  const commissions = computeAllCommissions(deals, services, partners);

  it("パートナーの明細行に月・クライアント・段が入る", () => {
    const lines = statementForPartner("p-acme", commissions, deals, services);
    expect(lines.length).toBeGreaterThan(0);
    for (const l of lines) {
      expect(l.month).toMatch(/^\d{4}-\d{2}$/);
      expect(l.clientName.length).toBeGreaterThan(0);
      expect([1, 2, 3]).toContain(l.tier);
    }
  });

  it("月次合計は accrued（見込み）を除外する", () => {
    const lines = statementForPartner("p-acme", commissions, deals, services);
    const totals = monthlyTotals(lines);
    const sum = totals.reduce((a, t) => a + t.total, 0);
    const confirmedSum = lines.filter((l) => l.status !== "accrued").reduce((a, l) => a + l.amount, 0);
    expect(sum).toBe(confirmedSum);
  });
});
