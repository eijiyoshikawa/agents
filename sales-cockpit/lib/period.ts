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

// ── 目標グリッド/実績突合の共通：対象月の列とキー ─────────────────
function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
/** その日が属する週の月曜（ローカル基準） */
export function mondayOf(input: Date): Date {
  const x = new Date(input);
  const day = x.getDay();
  const off = day === 0 ? 6 : day - 1;
  x.setDate(x.getDate() - off);
  x.setHours(0, 0, 0, 0);
  return x;
}
/** 対象月(YYYY-MM)の列。日次=各日 / 週次=各週の月曜 */
export function monthColumns(type: "日次" | "週次", month: string): { key: string; label: string }[] {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return [];
  const last = new Date(y, m, 0).getDate();
  if (type === "日次") {
    return Array.from({ length: last }, (_, i) => ({ key: `${month}-${pad(i + 1)}`, label: String(i + 1) }));
  }
  const cols: { key: string; label: string }[] = [];
  let mon = mondayOf(new Date(y, m - 1, 1));
  const end = new Date(y, m - 1, last);
  while (mon <= end) {
    cols.push({ key: ymd(mon), label: `${mon.getMonth() + 1}/${mon.getDate()}週` });
    mon = new Date(mon.getTime() + 7 * 86400000);
  }
  return cols;
}
/** ISO日時を期間キーへ（日次=YYYY-MM-DD / 週次=その週の月曜） */
export function periodKeyOf(type: "日次" | "週次", iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return type === "日次" ? ymd(d) : ymd(mondayOf(d));
}
