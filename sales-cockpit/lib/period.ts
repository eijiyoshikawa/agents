// 日付ユーティリティ。すべて JST(+9h) 基準でバケット化する。

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 任意の日付/ISO文字列を JST の Date(UTCフィールドにJST値が入る) に変換 */
function toJst(input: string | Date): Date | null {
  if (!input) return null;
  const d = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getTime() + JST_OFFSET_MS);
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** JST の YYYY-MM-DD */
export function jstDateKey(input: string | Date): string | null {
  const d = toJst(input);
  if (!d) return null;
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** JST の月キー YYYY-MM */
export function monthKey(input: string | Date): string | null {
  const k = jstDateKey(input);
  return k ? k.slice(0, 7) : null;
}

/** その日が属する週(月曜始まり)の月曜の YYYY-MM-DD（JST） */
export function weekKey(input: string | Date): string | null {
  const d = toJst(input);
  if (!d) return null;
  const day = d.getUTCDay(); // 0=日
  const diff = day === 0 ? 6 : day - 1; // 月曜まで戻す
  d.setUTCDate(d.getUTCDate() - diff);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** 直近 n 週の週キー配列（古い→新しい） */
export function recentWeekKeys(n: number, now = new Date()): string[] {
  const base = weekKey(now);
  if (!base) return [];
  const out: string[] = [];
  const [y, m, d] = base.split("-").map(Number);
  const monday = new Date(Date.UTC(y, m - 1, d));
  for (let i = n - 1; i >= 0; i--) {
    const dt = new Date(monday.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    out.push(`${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`);
  }
  return out;
}

/** 直近 n ヶ月の月キー配列（古い→新しい） */
export function recentMonthKeys(n: number, now = new Date()): string[] {
  const cur = monthKey(now);
  if (!cur) return [];
  const [y, m] = cur.split("-").map(Number);
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const dt = new Date(Date.UTC(y, m - 1 - i, 1));
    out.push(`${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}`);
  }
  return out;
}

/** 週キー(月曜) → "M/D週" ラベル */
export function weekLabel(key: string): string {
  const [, m, d] = key.split("-").map(Number);
  return `${m}/${d}週`;
}

/** 月キー → "YY年M月" ラベル */
export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return `${String(y).slice(2)}年${m}月`;
}

export function currentWeekKey(now = new Date()): string {
  return weekKey(now) ?? "";
}
export function currentMonthKey(now = new Date()): string {
  return monthKey(now) ?? "";
}
