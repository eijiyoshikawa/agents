// リーダーボード・重点サポート判定
// 仕様: docs/SPEC.md §3.2
import type { Commission, Deal, Partner } from "./types";
import { downlineIds } from "./tree";

export interface PartnerStats {
  partner: Partner;
  /** 自身の成約金額合計（確定 + 見込み） */
  ownSales: number;
  /** ダウンライン（子孫）の成約金額合計 */
  downlineSales: number;
  /** 自身 + ダウンラインの総売上 */
  totalSales: number;
  /** 自身が受け取る報酬合計（確定） */
  commissionEarned: number;
  /** 直接紹介したパートナー数 */
  directReferrals: number;
  /** ダウンライン総人数 */
  downlineCount: number;
  /** 直近30日に成約があったか（稼働中か） */
  activeRecently: boolean;
  /** 重点サポート優先度スコア（高いほど要サポート） */
  supportPriority: number;
  /** サポート優先の理由ラベル */
  supportReasons: string[];
}

const DAY = 24 * 60 * 60 * 1000;

function sumDeals(deals: Deal[]): number {
  return deals.reduce((acc, d) => acc + d.amount, 0);
}

/**
 * 全パートナーの成績統計を算出する。
 * now はテスト容易性のため注入可能（既定は現在時刻）。
 */
export function computeStats(
  partners: Partner[],
  deals: Deal[],
  commissions: Commission[],
  now: number = Date.now()
): PartnerStats[] {
  const dealsByPartner = new Map<string, Deal[]>();
  for (const d of deals) {
    if (!dealsByPartner.has(d.partnerId)) dealsByPartner.set(d.partnerId, []);
    dealsByPartner.get(d.partnerId)!.push(d);
  }

  const earnedByPartner = new Map<string, number>();
  for (const c of commissions) {
    if (c.status === "accrued") continue; // 確定分のみ
    earnedByPartner.set(
      c.partnerId,
      (earnedByPartner.get(c.partnerId) ?? 0) + c.amount
    );
  }

  const directCount = new Map<string, number>();
  for (const p of partners) {
    if (p.parentId) directCount.set(p.parentId, (directCount.get(p.parentId) ?? 0) + 1);
  }

  return partners.map((partner) => {
    const own = dealsByPartner.get(partner.id) ?? [];
    const ownSales = sumDeals(own);

    const downIds = downlineIds(partner.id, partners);
    let downlineSales = 0;
    for (const id of downIds) {
      downlineSales += sumDeals(dealsByPartner.get(id) ?? []);
    }

    const lastDeal = own.reduce<number>(
      (max, d) => Math.max(max, new Date(d.closedAt).getTime()),
      0
    );
    const activeRecently = lastDeal > 0 && now - lastDeal <= 30 * DAY;

    const stats: PartnerStats = {
      partner,
      ownSales,
      downlineSales,
      totalSales: ownSales + downlineSales,
      commissionEarned: earnedByPartner.get(partner.id) ?? 0,
      directReferrals: directCount.get(partner.id) ?? 0,
      downlineCount: downIds.size,
      activeRecently,
      supportPriority: 0,
      supportReasons: [],
    };
    return withSupportPriority(stats);
  });
}

/**
 * 重点サポート優先度を付与する。
 * 「ポテンシャルはあるが伸び悩んでいる / 休眠しかけている」紹介者を高くする。
 */
function withSupportPriority(s: PartnerStats): PartnerStats {
  const reasons: string[] = [];
  let score = 0;

  // ダウンラインを抱えるのに本人の成約が止まっている → 影響範囲が大きく要支援
  if (s.downlineCount > 0 && !s.activeRecently) {
    score += 40;
    reasons.push("ダウンラインがいるが本人が休眠気味");
  }
  // 直紹介が多い = 拡大意欲が高い → 伸ばす価値
  if (s.directReferrals >= 3) {
    score += 20;
    reasons.push("直接紹介が多く拡大意欲が高い");
  }
  // 売上はあるが報酬実感が薄い（確定報酬が小さい）→ 制度説明・後押し余地
  if (s.totalSales > 0 && s.commissionEarned === 0) {
    score += 15;
    reasons.push("売上はあるが確定報酬が未発生");
  }
  // まだ何も成約がない新規 → オンボーディング支援
  if (s.ownSales === 0 && s.downlineSales === 0) {
    score += 25;
    reasons.push("成約ゼロ・オンボーディング要");
  }

  return { ...s, supportPriority: score, supportReasons: reasons };
}

/** 総売上の降順でソートしたリーダーボード */
export function leaderboard(stats: PartnerStats[]): PartnerStats[] {
  return [...stats].sort((a, b) => b.totalSales - a.totalSales);
}

/** サポート優先度の降順（同点は総売上の小さい順）でソート */
export function supportQueue(stats: PartnerStats[]): PartnerStats[] {
  return [...stats]
    .filter((s) => s.supportPriority > 0)
    .sort(
      (a, b) =>
        b.supportPriority - a.supportPriority || a.totalSales - b.totalSales
    );
}
