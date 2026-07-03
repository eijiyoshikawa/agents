import type { JobPosting } from "./types";

/** 履歴エントリの共通型（保存先に依存しない）。 */
export interface HistoryEntry {
  id: string;
  savedAt: number;
  title: string;
  job: JobPosting;
}

/** 一覧表示用のタイトルを組み立てる。 */
export function makeTitle(job: JobPosting): string {
  const company = job.companyName || "（会社名未入力）";
  const role = job.jobTitle || job.catchphrase || "求人票";
  return `${company}｜${role}`;
}

/** 一括編集でまとめて設定できるテキスト系フィールド。 */
export const BULK_FIELDS = [
  { key: "companyWebsite", label: "会社HP" },
  { key: "companyAddress", label: "本社所在地" },
  { key: "industry", label: "業種" },
  { key: "establishedYear", label: "設立年" },
  { key: "employeeCount", label: "従業員数" },
  { key: "listingStatus", label: "上場区分" },
  { key: "averageAge", label: "平均年齢" },
  { key: "genderRatio", label: "男女比率" },
  { key: "employmentType", label: "雇用形態" },
  { key: "workLocation", label: "勤務地" },
  { key: "workHours", label: "勤務時間" },
  { key: "holidays", label: "休日休暇" },
  { key: "smokingPolicy", label: "受動喫煙対策" },
] as const;

export type BulkFieldKey = (typeof BULK_FIELDS)[number]["key"];

/** 会社名・職種等でエントリ配列を絞り込む（大文字小文字無視）。 */
export function filterHistory(
  entries: HistoryEntry[],
  query: string,
): HistoryEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return entries;
  return entries.filter((e) => {
    const j = e.job;
    const haystack = [
      j.companyName,
      j.jobTitle,
      j.catchphrase,
      j.industry,
      j.workLocation,
      e.title,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

/** 保存時刻を「YYYY/MM/DD HH:mm」で整形する。 */
export function formatSavedAt(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** 1エントリの指定フィールドを一括更新のルールで書き換える（純粋関数）。 */
export function applyBulkField(
  entry: HistoryEntry,
  field: BulkFieldKey,
  value: string,
  mode: "overwrite" | "fillEmpty",
  timestamp: number,
): HistoryEntry {
  const current = entry.job[field];
  if (mode === "fillEmpty" && current) return entry;
  const job = { ...entry.job, [field]: value };
  return { ...entry, job, title: makeTitle(job), savedAt: timestamp };
}
