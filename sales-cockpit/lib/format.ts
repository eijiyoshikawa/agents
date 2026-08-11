export function yen(n: number): string {
  return `¥${Math.round(n).toLocaleString("ja-JP")}`;
}

export function pct(n: number): string {
  return `${n.toFixed(1)}%`;
}

export function num(n: number): string {
  return n.toLocaleString("ja-JP");
}

/** 0除算を避けたアポ率(%) */
export function rate(part: number, whole: number): number {
  return whole > 0 ? (part / whole) * 100 : 0;
}
