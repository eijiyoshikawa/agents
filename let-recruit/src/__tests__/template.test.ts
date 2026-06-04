import { describe, it, expect } from "vitest";
import { buildJobPostingHtml, formatSalary, esc } from "@/lib/template";
import { LET_COMPANY } from "@/lib/company";
import { emptyJobPosting, JobPostingSchema } from "@/lib/types";

describe("esc", () => {
  it("HTML特殊文字をエスケープする(XSS対策)", () => {
    expect(esc('<script>"&\'')).toBe(
      "&lt;script&gt;&quot;&amp;&#39;",
    );
  });
});

describe("formatSalary", () => {
  it("min/maxを万円レンジで表示", () => {
    const s = JobPostingSchema.parse({}).salary;
    expect(formatSalary({ ...s, min: 300000, max: 500000 })).toContain("30万円");
    expect(formatSalary({ ...s, min: 300000, max: 500000 })).toContain("50万円");
  });

  it("数値が無ければnoteのみ", () => {
    const s = JobPostingSchema.parse({}).salary;
    expect(formatSalary({ ...s, note: "応相談" })).toBe("応相談");
  });
});

describe("buildJobPostingHtml", () => {
  it("有効なHTML文書を返す", () => {
    const html = buildJobPostingHtml(emptyJobPosting(), LET_COMPANY);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("@page");
    expect(html).toContain(LET_COMPANY.brand.accent);
  });

  it("コピーが反映され、危険な入力はエスケープされる", () => {
    const job = emptyJobPosting();
    job.companyName = "テスト社<img>";
    job.catchphrase = "成長しよう";
    const html = buildJobPostingHtml(job, LET_COMPANY);
    expect(html).toContain("成長しよう");
    expect(html).toContain("テスト社&lt;img&gt;");
    expect(html).not.toContain("テスト社<img>");
  });

  it("空の求人票では概要セクションを描画しない", () => {
    const html = buildJobPostingHtml(emptyJobPosting(), LET_COMPANY);
    expect(html).not.toContain("求人概要");
  });
});
