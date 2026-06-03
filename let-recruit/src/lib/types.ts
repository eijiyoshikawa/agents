import { z } from "zod";

/**
 * 求人票の構造化スキーマ。
 * 他社求人URLからAI抽出した内容を、この形に正規化してLETデザインへ流し込む。
 */
export const SalarySchema = z.object({
  type: z.string().default("月給"), // 月給 / 年収 / 時給 など
  min: z.number().nullable().default(null),
  max: z.number().nullable().default(null),
  note: z.string().default(""),
});

export const JobPostingSchema = z.object({
  jobTitle: z.string().default(""), // 募集職種
  catchphrase: z.string().default(""), // キャッチコピー（1行）
  summary: z.string().default(""), // 仕事内容の概要（2〜3文）
  responsibilities: z.array(z.string()).default([]), // 具体的な業務内容
  requiredSkills: z.array(z.string()).default([]), // 必須要件
  preferredSkills: z.array(z.string()).default([]), // 歓迎要件
  idealCandidate: z.array(z.string()).default([]), // 求める人物像
  appealPoints: z.array(z.string()).default([]), // この仕事の魅力・アピール
  employmentType: z.string().default(""), // 雇用形態
  salary: SalarySchema.default({ type: "月給", min: null, max: null, note: "" }),
  workLocation: z.string().default(""), // 勤務地
  workHours: z.string().default(""), // 勤務時間
  holidays: z.string().default(""), // 休日・休暇
  benefits: z.array(z.string()).default([]), // 福利厚生
  selectionProcess: z.array(z.string()).default([]), // 選考プロセス
});

export type Salary = z.infer<typeof SalarySchema>;
export type JobPosting = z.infer<typeof JobPostingSchema>;

/** 抽出API のリクエスト/レスポンス */
/** URLモード: 他社求人URLを統合 */
export const ExtractUrlRequestSchema = z.object({
  mode: z.literal("url"),
  urls: z.array(z.string().url()).min(1).max(8),
});

/** テキストモード: 自由記述の素案をAIが整理 */
export const ExtractTextRequestSchema = z.object({
  mode: z.literal("text"),
  text: z.string().min(10).max(20000),
});

/** 後方互換: mode 未指定なら urls があれば url モード扱い */
export const ExtractRequestSchema = z.union([
  ExtractUrlRequestSchema,
  ExtractTextRequestSchema,
  z.object({ urls: z.array(z.string().url()).min(1).max(8) }),
]);
export type ExtractRequest = z.infer<typeof ExtractRequestSchema>;

export interface ExtractResponse {
  job: JobPosting;
  sources: { url: string; fetched: boolean; note?: string }[];
}

/** LET（自社）情報 */
export interface CompanyProfile {
  name: string;
  nameEn: string;
  tagline: string;
  about: string;
  website: string;
  email: string;
  tel: string;
  address: string;
  /** ブランドカラー（feerベース。ロゴ確定後に差し替え可能） */
  brand: {
    ink: string;
    cream: string;
    accent: string;
    accentDark: string;
    surface: string;
  };
}

/** 空の求人票（フォーム初期値） */
export function emptyJobPosting(): JobPosting {
  return JobPostingSchema.parse({});
}
