// Notion 連携: 登録された紹介者を既存の「DB_協業先管理」へ追加する。
//
// 連携先（実スキーマを取得済み）:
//   DB:          DB_協業先管理
//   page/db id:  007f6461b55d4013879bd4a94abbc05c
//   data source: cff6b8a1-3c55-4f31-b4c8-3be999205b71
//   主なプロパティ: 顧問先名(title) / カテゴリ(select) / 担当者名 / メールアドレス /
//                  紹介元 / 報酬体系 / 関係性ステータス(select) / 契約開始日(date)
//
// 実行モデル: 静的サイトはサーバを持たないため、Notion への書き込みは
//   (a) register_partner 後にサーバ側バッチ（scripts/sync-notion.mjs, v1）か
//   (b) Supabase Edge Function から行う。
// 本モジュールは「Partner → Notion プロパティ」への変換と API ペイロード生成を担う。
// 環境変数 NOTION_TOKEN が未設定の場合は送信せずペイロードのみ返す（スタブ動作）。
import type { Partner } from "@/lib/types";

export const NOTION_DATA_SOURCE_ID = "cff6b8a1-3c55-4f31-b4c8-3be999205b71";
export const NOTION_DATABASE_ID = "007f6461b55d4013879bd4a94abbc05c";
const NOTION_VERSION = "2022-06-28";

/** 関係性ステータス（DB_協業先管理 の select 値）へのマッピング */
function relationshipStatus(status: Partner["status"]): string {
  switch (status) {
    case "active":
      return "契約中";
    case "dormant":
      return "休止中";
    case "suspended":
      return "契約終了";
  }
}

/**
 * Partner を Notion ページ作成リクエストの properties に変換する。
 * 紹介元の表示名（任意）を渡すと「紹介元」プロパティに設定する。
 */
export function buildNotionProperties(
  partner: Partner,
  referrerName?: string,
  loginId?: string
): Record<string, unknown> {
  const props: Record<string, unknown> = {
    顧問先名: { title: [{ text: { content: partner.name } }] },
    カテゴリ: { select: { name: "パートナー" } },
    関係性ステータス: { select: { name: relationshipStatus(partner.status) } },
    報酬体系: {
      rich_text: [{ text: { content: `紹介報酬 2段階（招待コード: ${partner.referralCode}）` } }],
    },
    契約開始日: { date: { start: partner.joinedAt } },
  };
  if (partner.contact?.person) {
    props["担当者名"] = { rich_text: [{ text: { content: partner.contact.person } }] };
  }
  if (partner.contact?.email) {
    props["メールアドレス"] = { email: partner.contact.email };
  }
  if (referrerName) {
    props["紹介元"] = { rich_text: [{ text: { content: referrerName } }] };
  }
  if (loginId) {
    // ※ Notion 側に「ログインID」テキスト列が必要（パスワードは同期しない）
    props["ログインID"] = { rich_text: [{ text: { content: loginId } }] };
  }
  return props;
}

export interface NotionSyncResult {
  ok: boolean;
  notionPageId?: string;
  payload: { parent: { database_id: string }; properties: Record<string, unknown> };
  note?: string;
}

/**
 * Notion DB に1行追加（または既存ページを更新）する。
 * existingPageId があれば PATCH で更新、無ければ POST で新規作成。
 * NOTION_TOKEN 未設定ならスタブとしてペイロードのみ返す。
 */
export async function syncPartnerToNotion(
  partner: Partner,
  referrerName?: string,
  existingPageId?: string | null,
  loginId?: string
): Promise<NotionSyncResult> {
  const properties = buildNotionProperties(partner, referrerName, loginId);
  const payload = { parent: { database_id: NOTION_DATABASE_ID }, properties };

  const token = process.env.NOTION_TOKEN;
  if (!token) {
    return { ok: false, payload, note: "NOTION_TOKEN 未設定: 送信せずペイロードのみ返却（スタブ）" };
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    "Notion-Version": NOTION_VERSION,
    "Content-Type": "application/json",
  };

  const res = existingPageId
    ? await fetch(`https://api.notion.com/v1/pages/${existingPageId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ properties }),
      })
    : await fetch("https://api.notion.com/v1/pages", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

  if (!res.ok) {
    const text = await res.text();
    return { ok: false, payload, note: `Notion API エラー: ${res.status} ${text}` };
  }
  const json = (await res.json()) as { id: string };
  return { ok: true, notionPageId: json.id ?? existingPageId ?? undefined, payload };
}
