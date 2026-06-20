// Notion 連携スタブ（v1 で実装）
//
// 紹介者を本システムから登録したら、既存の Notion DB にも行を追加する。
// 連携先 DB:
//   https://app.notion.com/p/007f6461b55d4013879bd4a94abbc05c?v=e574c04c6fff4f12934355012fba0d63
//
// v0 では実接続せず、Partner → Notion プロパティのマッピングだけを定義する。
// v1 で Notion API（MCP / @notionhq/client）を使い syncPartnerToNotion を実装する。
import type { Partner } from "@/lib/types";

/** 連携先 Notion データベース ID（URL の /p/<id> 部分） */
export const NOTION_PARTNER_DB_ID = "007f6461b55d4013879bd4a94abbc05c";

/** Partner を Notion DB の行（プロパティ）に変換する。実プロパティ名は v1 で DB に合わせて調整する */
export interface NotionPartnerRow {
  会社名: string;
  紹介コード: string;
  ステータス: Partner["status"];
  登録日: string;
  担当者?: string;
  メール?: string;
  紹介元?: string | null;
}

export function partnerToNotionRow(partner: Partner): NotionPartnerRow {
  return {
    会社名: partner.name,
    紹介コード: partner.referralCode,
    ステータス: partner.status,
    登録日: partner.joinedAt,
    担当者: partner.contact?.person,
    メール: partner.contact?.email,
    紹介元: partner.parentId,
  };
}

/**
 * v1 で実装: 登録済みパートナーを Notion DB に追加する。
 * 現状はスタブ（未接続）。実接続時に Notion API 呼び出しへ差し替える。
 */
export async function syncPartnerToNotion(
  partner: Partner
): Promise<{ ok: boolean; row: NotionPartnerRow; note: string }> {
  const row = partnerToNotionRow(partner);
  return {
    ok: false,
    row,
    note: "v0 スタブ: Notion へは未接続。v1 で NOTION_PARTNER_DB_ID に対し行を追加する。",
  };
}
