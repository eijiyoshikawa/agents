import { describe, it, expect } from "vitest";
import { extractJsonBlock, parseJobJson } from "@/lib/extract-job";

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
});

describe("parseJobJson", () => {
  it("スキーマで正規化し欠損はデフォルト補完", () => {
    const job = parseJobJson('{"jobTitle":"エンジニア"}');
    expect(job.jobTitle).toBe("エンジニア");
    expect(job.responsibilities).toEqual([]);
    expect(job.salary.type).toBe("月給");
  });

  it("不正JSONは例外", () => {
    expect(() => parseJobJson("{壊れた")).toThrow();
  });
});
