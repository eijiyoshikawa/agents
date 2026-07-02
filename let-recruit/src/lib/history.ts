import type { JobPosting } from "./types";

/** localStorageに保存する求人票の履歴エントリ。 */
export interface HistoryEntry {
  id: string;
  savedAt: number; // 保存時刻（epoch ms）
  title: string; // 一覧表示用（会社名・職種から自動生成）
  job: JobPosting;
}

const STORAGE_KEY = "let-recruit-history";
const MAX_ENTRIES = 100;

/** 一覧表示用のタイトルを組み立てる。 */
export function makeTitle(job: JobPosting): string {
  const company = job.companyName || "（会社名未入力）";
  const role = job.jobTitle || job.catchphrase || "求人票";
  return `${company}｜${role}`;
}

/** 履歴を全件読み込む（新しい順）。 */
export function loadHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as HistoryEntry[];
    if (!Array.isArray(list)) return [];
    return list.sort((a, b) => b.savedAt - a.savedAt);
  } catch {
    return [];
  }
}

/** 履歴を保存する（内部用）。 */
function persist(list: HistoryEntry[]): void {
  if (typeof window === "undefined") return;
  const trimmed = list.slice(0, MAX_ENTRIES);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

/**
 * 求人票を履歴に保存する。
 * id を指定すると同じエントリを上書き（更新）、無ければ新規追加。
 * 保存後の全履歴を返す。
 */
export function saveEntry(
  job: JobPosting,
  id: string | null,
  timestamp: number,
): { id: string; history: HistoryEntry[] } {
  const list = loadHistory();
  const title = makeTitle(job);

  if (id) {
    const idx = list.findIndex((e) => e.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], job, title, savedAt: timestamp };
      persist(list);
      return { id, history: loadHistory() };
    }
  }

  // 新規（idはタイムスタンプ + ランダム桁で一意化。Math.randomは使わずindexで代替）
  const newId = `${timestamp}-${list.length}`;
  const entry: HistoryEntry = { id: newId, savedAt: timestamp, title, job };
  persist([entry, ...list]);
  return { id: newId, history: loadHistory() };
}

/** 指定IDの履歴を削除し、残りを返す。 */
export function deleteEntry(id: string): HistoryEntry[] {
  const list = loadHistory().filter((e) => e.id !== id);
  persist(list);
  return list;
}

/** 保存時刻を「YYYY/MM/DD HH:mm」で整形する。 */
export function formatSavedAt(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
