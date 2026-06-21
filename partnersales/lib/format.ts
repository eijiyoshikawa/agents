/** 円表記（カンマ区切り） */
export function yen(n: number): string {
  return "¥" + Math.round(n).toLocaleString("ja-JP");
}
