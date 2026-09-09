// 優先アプローチスコア。2026年5〜9月の江原担当アポ実績分析（アポ化率）に基づく。
// 根拠: CIRCUS経由12.0% / 首都圏5.2-5.4% / 100-299名4.3% / 29名以下1.2% / C・D評価0.2%
import type { ListCustomer } from "./types";

const METRO_KANTO = ["東京", "神奈川", "横浜", "川崎", "埼玉", "さいたま", "千葉"];
const KANSAI = ["大阪", "兵庫", "神戸", "尼崎", "京都", "奈良", "滋賀", "和歌山"];

function areaOf(address: string | null): "kanto" | "kansai" | "other" {
  if (!address) return "other";
  if (METRO_KANTO.some((k) => address.includes(k))) return "kanto";
  if (KANSAI.some((k) => address.includes(k))) return "kansai";
  return "other";
}

/**
 * リードの優先度スコア（高いほど先に架電すべき）。同期時に計算しDBへ保存する。
 * 実績のアポ化率が高いセグメントに加点、低いセグメントに減点。
 */
export function scoreLead(c: Pick<ListCustomer, "address" | "employees" | "media" | "rank">): number {
  let s = 0;
  // 媒体: CIRCUS経由はアポ化率12%（他媒体の約4倍）
  const media = c.media ?? [];
  if (media.some((m) => m.includes("CIRCUS"))) s += 40;
  // エリア: 首都圏5.2-5.4% vs 関西2%前後
  const a = areaOf(c.address);
  if (a === "kanto") s += 30;
  else if (a === "kansai") s += 5;
  // 規模: 100-299名4.3%が最良、29名以下1.2%は非効率
  const e = c.employees;
  if (e != null) {
    if (e >= 100 && e < 300) s += 30;
    else if (e >= 300) s += 20;
    else if (e >= 30) s += 10;
    else s -= 20;
  }
  // 見込み度合い（設定済みの場合）: C/Dはほぼアポ化しない
  if (c.rank === "A") s += 15;
  else if (c.rank === "B") s += 5;
  else if (c.rank === "C") s -= 30;
  else if (c.rank === "D") s -= 40;
  return s;
}

/** スコアの目安ラベル（UI表示用） */
export function scoreTier(s: number | null): { label: string; cls: string } {
  if (s == null) return { label: "未計算", cls: "text-ink-muted" };
  if (s >= 60) return { label: "最優先", cls: "text-accent-red" };
  if (s >= 40) return { label: "高", cls: "text-accent-amber" };
  if (s >= 20) return { label: "中", cls: "text-accent-teal" };
  return { label: "低", cls: "text-ink-muted" };
}
