/**
 * 統合・改名したダッシュボードの古い key を、今の key に読み替える。
 * 2026-11-09: 「採用マーケティング運用管理（ops）」は「案件KPI（kpi）」と 1 枚にまとめた（masterAI 側も 1 画面に統合済み）。
 * メンバー管理で ops にチェックしていた人は、そのまま kpi を見られるようにする。
 */
const ALIASES: Record<string, string> = { ops: "kpi" };

export function normalizeAllow(allow: string[]): string[];
export function normalizeAllow(allow: string[] | null | undefined): string[] | null;
export function normalizeAllow(allow: string[] | null | undefined): string[] | null {
  if (!Array.isArray(allow)) return null;
  return [...new Set(allow.map((k) => ALIASES[k] ?? k))];
}
