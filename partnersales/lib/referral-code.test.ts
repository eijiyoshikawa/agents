import { describe, expect, it } from "vitest";
import {
  generateReferralCode,
  prefixFromName,
  randomCode,
  slugify,
  uniqueSlug,
} from "./referral-code";

describe("randomCode", () => {
  it("指定桁で紛らわしい文字を含まない", () => {
    const code = randomCode(6);
    expect(code).toHaveLength(6);
    expect(code).not.toMatch(/[01OIL]/);
    expect(code).toMatch(/^[A-Z2-9]+$/);
  });
});

describe("prefixFromName", () => {
  it("英字から大文字4桁を作る", () => {
    expect(prefixFromName("Acme Corp")).toBe("ACME");
    expect(prefixFromName("BlueSky")).toBe("BLUE");
  });
  it("英字が短い/無い場合は補完する", () => {
    expect(prefixFromName("AB")).toBe("ABXX");
    expect(prefixFromName("株式会社")).toBe("PTNR");
  });
});

describe("generateReferralCode", () => {
  it("接頭辞-コード形式で生成する", () => {
    const code = generateReferralCode("Acme");
    expect(code).toMatch(/^ACME-[A-Z2-9]{4}$/);
  });
  it("衝突時は再生成して一意なコードを返す", () => {
    const taken = new Set(["ACME-AAAA"]);
    let first = true;
    // 最初の1回だけ衝突する isTaken を模擬
    const isTaken = (c: string) => {
      if (first && c.startsWith("ACME-")) {
        first = false;
        return true;
      }
      return taken.has(c);
    };
    const code = generateReferralCode("Acme", isTaken);
    expect(code).toMatch(/^ACME-/);
  });
});

describe("slugify / uniqueSlug", () => {
  it("英数字とハイフンのスラッグを作る", () => {
    expect(slugify("Blue Sky LLC")).toBe("blue-sky-llc");
    expect(slugify("  Acme!! ")).toBe("acme");
  });
  it("和名のみは partner にフォールバック", () => {
    expect(slugify("株式会社")).toBe("partner");
  });
  it("衝突時に連番を付与する", () => {
    const taken = new Set(["acme", "acme-2"]);
    expect(uniqueSlug("Acme", (s) => taken.has(s))).toBe("acme-3");
  });
});
