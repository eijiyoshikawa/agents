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
<<<<<<< HEAD
  it("月給・年収レンジ(万円)を表示", () => {
    const s = JobPostingSchema.parse({}).salary;
    const out = formatSalary({
      ...s,
      monthlyMin: 30,
      monthlyMax: 55,
      annualMin: 420,
      annualMax: 800,
    });
    expect(out).toContain("月給 30万円 〜 55万円");
    expect(out).toContain("想定年収 420万円 〜 800万円");
=======
  it("min/maxを万円レンジで表示", () => {
    const s = JobPostingSchema.parse({}).salary;
    expect(formatSalary({ ...s, min: 300000, max: 500000 })).toContain("30万円");
    expect(formatSalary({ ...s, min: 300000, max: 500000 })).toContain("50万円");
>>>>>>> claude/evaluation-finance-dashboard-50w8t9
  });

  it("数値が無ければnoteのみ", () => {
    const s = JobPostingSchema.parse({}).salary;
    expect(formatSalary({ ...s, note: "応相談" })).toBe("応相談");
  });
<<<<<<< HEAD

  it("旧形式(円)の保存データは万円へ自動変換される", () => {
    const job = JobPostingSchema.parse({
      salary: { type: "月給", min: 300000, max: 550000, note: "賞与年2回" },
    });
    expect(job.salary.monthlyMin).toBe(30);
    expect(job.salary.monthlyMax).toBe(55);
    expect(job.salary.annualMin).toBeNull();
    expect(job.salary.note).toBe("賞与年2回");
  });

  it("端数のある金額(196000円)は19.6万円として扱える", () => {
    const job = JobPostingSchema.parse({
      salary: { type: "月給", min: 196000, max: 250000, note: "" },
    });
    expect(job.salary.monthlyMin).toBe(19.6);
    expect(job.salary.monthlyMax).toBe(25);
    const out = formatSalary(job.salary);
    expect(out).toContain("19.6万円");
    expect(out).toContain("25万円");
  });

  it("旧形式(年収)はannual側へ変換される", () => {
    const job = JobPostingSchema.parse({
      salary: { type: "年収", min: 4200000, max: 5000000, note: "" },
    });
    expect(job.salary.annualMin).toBe(420);
    expect(job.salary.annualMax).toBe(500);
    expect(job.salary.monthlyMin).toBeNull();
  });
=======
>>>>>>> claude/evaluation-finance-dashboard-50w8t9
});

describe("buildJobPostingHtml", () => {
  it("有効なHTML文書を返す", () => {
    const html = buildJobPostingHtml(emptyJobPosting(), LET_COMPANY);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("@page");
    expect(html).toContain(LET_COMPANY.brand.accent);
  });

<<<<<<< HEAD
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
=======
  it("職種・コピーが反映され、危険な入力はエスケープされる", () => {
    const job = emptyJobPosting();
    job.jobTitle = "エンジニア<img>";
    job.catchphrase = "成長しよう";
    const html = buildJobPostingHtml(job, LET_COMPANY);
    expect(html).toContain("成長しよう");
    expect(html).toContain("エンジニア&lt;img&gt;");
    expect(html).not.toContain("エンジニア<img>");
  });

  it("空セクションは描画しない", () => {
    const html = buildJobPostingHtml(emptyJobPosting(), LET_COMPANY);
    expect(html).not.toContain("選考プロセス");
>>>>>>> claude/evaluation-finance-dashboard-50w8t9
  });
});
