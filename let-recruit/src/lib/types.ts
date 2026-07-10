import { z } from "zod";

/**
 * 求人票の構造化スキーマ。
 * 他社求人URLからAI抽出した内容を、この形に正規化してLETデザインへ流し込む。
 */
/**
 * 給与。月給と年収それぞれのレンジを「万円」の数値で持つ。
 * 旧形式 {type:"月給"|"年収", min, max(円), note} は自動変換して読み込む。
 */
export const SalarySchema = z.preprocess(
  (val) => {
    if (val && typeof val === "object" && "type" in val) {
      // 旧形式からの移行
      const old = val as {
        type?: string;
        min?: number | null;
        max?: number | null;
        note?: string;
      };
      const toMan = (n: number | null | undefined) =>
        n == null ? null : n >= 10000 ? Math.round(n / 1000) / 10 : n;
      const isAnnual = old.type === "年収";
      return {
        monthlyMin: isAnnual ? null : toMan(old.min),
        monthlyMax: isAnnual ? null : toMan(old.max),
        annualMin: isAnnual ? toMan(old.min) : null,
        annualMax: isAnnual ? toMan(old.max) : null,
        note: old.note ?? "",
      };
    }
    return val;
  },
  z.object({
    monthlyMin: z.number().nullable().default(null), // 月給下限（万円）
    monthlyMax: z.number().nullable().default(null), // 月給上限（万円）
    annualMin: z.number().nullable().default(null), // 想定年収下限（万円）
    annualMax: z.number().nullable().default(null), // 想定年収上限（万円）
    note: z.string().default(""), // 賞与・昇給・手当等の補足
  }),
);

export const JobPostingSchema = z.object({
  // ── ヘッダー ──
  catchphrase: z.string().default(""), // タイトル/キャッチコピー（1行）

  // ── 会社基本情報（事実・手入力中心） ──
  companyName: z.string().default(""), // 会社名
  industry: z.string().default(""), // 業種
  occupation: z.string().default(""), // 職種
  establishedYear: z.string().default(""), // 設立年
  employeeCount: z.string().default(""), // 従業員数
  listingStatus: z.string().default(""), // 上場区分
  averageAge: z.string().default(""), // 平均年齢
  genderRatio: z.string().default(""), // 男女比率
  companyWebsite: z.string().default(""), // 会社HP
  companyAddress: z.string().default(""), // 本社所在地

  // ── 募集条件（事実・手入力中心） ──
  jobTitle: z.string().default(""), // 募集職種
  employmentType: z.string().default(""), // 雇用形態
  recruitPosition: z.string().default(""), // 採用ポジション（中途採用 等）
  jobLevel: z.string().default(""), // 職位（リーダー/メンバー 等）
  education: z.string().default(""), // 最終学歴
  jobExperience: z.string().default(""), // 職種経験
  industryExperience: z.string().default(""), // 業種経験

  // ── 求人内容（AI抽出対象） ──
  summary: z.string().default(""), // 仕事内容の概要
  responsibilities: z.array(z.string()).default([]), // 主な業務内容
  requiredSkills: z.array(z.string()).default([]), // 必須条件
  idealCandidate: z.array(z.string()).default([]), // 内定の可能性が高い人/求める人物像
  appealPoints: z.array(z.string()).default([]), // この求人の魅力
  philosophy: z.string().default(""), // 理念・ビジョン
  businessDescription: z.string().default(""), // 事業内容と今後の事業展開
  culture: z.string().default(""), // 働く人・社風
  prPoints: z.string().default(""), // PRポイント
  recruitBackground: z.string().default(""), // 募集背景
  orgStructure: z.string().default(""), // 現在の組織構成

  // ── 待遇（AI抽出 + 手入力） ──
  salary: SalarySchema.default({
    monthlyMin: null,
    monthlyMax: null,
    annualMin: null,
    annualMax: null,
    note: "",
  }),
  salaryDetail: z.string().default(""), // 給与・年収例の詳細
  workLocation: z.string().default(""), // 勤務地
  workHours: z.string().default(""), // 勤務時間
  overtime: z.string().default(""), // 残業・補足
  holidays: z.string().default(""), // 休日休暇
  benefits: z.array(z.string()).default([]), // 福利厚生・諸手当
  smokingPolicy: z.string().default(""), // 受動喫煙対策

  // ── 選考情報 ──
  casualInterview: z.string().default(""), // カジュアル面談の有無
  companyBriefing: z.string().default(""), // 会社説明会の有無
  aptitudeTest: z.string().default(""), // 適性テストの有無
  selectionProcess: z.array(z.string()).default([]), // 選考フロー
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

/** LET（自社）情報 = 求人票の発行元/提供元 */
export interface CompanyProfile {
  name: string;
  nameEn: string;
  tagline: string;
  about: string;
  website: string;
  email: string;
  tel: string;
  address: string;
  /** 求人提供元（有料職業紹介事業者）情報 */
  agency: {
    name: string; // 事業者名
    address: string; // 本社所在地
    licenseNumber: string; // 有料職業紹介許可番号
  };
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
