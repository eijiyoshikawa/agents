/** 円表記（カンマ区切り） */
export function yen(n: number): string {
  return "¥" + Math.round(n).toLocaleString("ja-JP");
}

/** 割合表記 */
export function pct(rate: number): string {
  return (rate * 100).toFixed(rate * 100 % 1 === 0 ? 0 : 1) + "%";
}
