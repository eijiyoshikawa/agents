import { describe, it, expect } from "vitest";
import {
  extractJsonBlock,
  parseJobJson,
  repairTruncatedJson,
} from "@/lib/extract-job";

describe("extractJsonBlock", () => {
  it("```json フェンスから抽出する", () => {
    const raw = 'これです:\n```json\n{"jobTitle":"A"}\n```\n以上';
    expect(extractJsonBlock(raw)).toBe('{"jobTitle":"A"}');
  });

  it("フェンスなしの前後文章からも抽出する", () => {
    const raw = 'お答えします {"a":1} どうぞ';
    expect(extractJsonBlock(raw)).toBe('{"a":1}');
  });

  it("JSONが無ければ例外", () => {
    expect(() => extractJsonBlock("テキストのみ")).toThrow();
  });

  it("閉じ括弧が無い途中切れでも先頭から返す（修復に回す）", () => {
    const raw = '結果: {"jobTitle":"エンジニア","summary":"仕事';
    expect(extractJsonBlock(raw)).toBe('{"jobTitle":"エンジニア","summary":"仕事');
  });
});

describe("repairTruncatedJson", () => {
  it("文字列の途中で切れたJSONを修復する", () => {
    const broken = '{"jobTitle":"エンジニア","summary":"仕事内容の説明が途中で';
    const repaired = repairTruncatedJson(broken);
    const obj = JSON.parse(repaired);
    expect(obj.jobTitle).toBe("エンジニア");
  });

  it("配列の途中で切れたJSONを修復する", () => {
    const broken = '{"benefits":["社会保険完備","交通費支給","住宅';
    const obj = JSON.parse(repairTruncatedJson(broken));
    expect(obj.benefits).toContain("社会保険完備");
    expect(obj.benefits).toContain("交通費支給");
  });

  it('「"key": 」まで書いて切れた場合も壊れない', () => {
    const broken = '{"jobTitle":"営業","salary":';
    const obj = JSON.parse(repairTruncatedJson(broken));
    expect(obj.jobTitle).toBe("営業");
  });

  it("ネストした途中切れも閉じられる", () => {
    const broken =
      '{"salary":{"type":"月給","min":300000,"max":500000,"note":"賞与';
    const obj = JSON.parse(repairTruncatedJson(broken));
    expect(obj.salary.min).toBe(300000);
  });
});

describe("parseJobJson", () => {
  it("スキーマで正規化し欠損はデフォルト補完", () => {
    const job = parseJobJson('{"jobTitle":"エンジニア"}');
    expect(job.jobTitle).toBe("エンジニア");
    expect(job.responsibilities).toEqual([]);
    expect(job.salary.monthlyMin).toBeNull();
  });

  it("途中切れの応答からも読める部分を復元する", () => {
    const truncated =
      '{"jobTitle":"施工管理","companyName":"テスト建設","summary":"新築の';
    const job = parseJobJson(truncated);
    expect(job.jobTitle).toBe("施工管理");
    expect(job.companyName).toBe("テスト建設");
  });

  it("JSONを含まない応答は例外", () => {
    expect(() => parseJobJson("すみません、できませんでした")).toThrow();
  });
});
