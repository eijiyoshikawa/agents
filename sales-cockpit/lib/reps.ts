// 担当者（IS/S）に関する共通ルール。
// 退任・非稼働メンバーは全ページの「担当者別」集計および目標設定の対象から除外する。
// 会社全体の総数（コンタクト済み・MRR等）には影響させない（担当別の行/選択肢のみ除外）。
export const EXCLUDED_REPS = ["ロビンソンin", "佐久間in", "海野in", "三輪in", "境田in", "長野"];

const EXCLUDED = new Set(EXCLUDED_REPS);

/** 集計・目標設定の対象外メンバーか（null/未割当は対象外ではない＝除外しない） */
export function isExcludedRep(name: string | null | undefined): boolean {
  return !!name && EXCLUDED.has(name);
}
