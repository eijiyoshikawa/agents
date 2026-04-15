import { describe, it, expect } from "vitest";
import { CATEGORY_CONFIG } from "@/lib/types/database";

describe("CATEGORY_CONFIG", () => {
  it("has all required categories", () => {
    const expected = ["general", "garbage", "disaster", "event", "important"];
    expect(Object.keys(CATEGORY_CONFIG)).toEqual(expected);
  });

  it("each category has label, color, and bg", () => {
    for (const [key, config] of Object.entries(CATEGORY_CONFIG)) {
      expect(config.label).toBeTruthy();
      expect(config.color).toBeTruthy();
      expect(config.bg).toBeTruthy();
    }
  });

  it("has correct Japanese labels", () => {
    expect(CATEGORY_CONFIG.general.label).toBe("一般連絡");
    expect(CATEGORY_CONFIG.garbage.label).toBe("ゴミ収集");
    expect(CATEGORY_CONFIG.disaster.label).toBe("防災");
    expect(CATEGORY_CONFIG.event.label).toBe("イベント");
    expect(CATEGORY_CONFIG.important.label).toBe("重要");
  });
});
