import { describe, expect, it } from "vitest";
import { buildNotionProperties, syncPartnerToNotion, NOTION_DATABASE_ID } from "./notion";
import type { Partner } from "@/lib/types";

const partner: Partner = {
  id: "p-test",
  name: "テスト株式会社",
  slug: "test",
  parentId: "p-acme",
  referralCode: "TEST-1234",
  contact: { person: "田中一郎", email: "tanaka@test.example" },
  joinedAt: "2026-06-20",
  status: "active",
};

describe("buildNotionProperties", () => {
  it("DB_協業先管理 のプロパティ名に正しくマッピングする", () => {
    const props = buildNotionProperties(partner, "株式会社アクメ") as Record<string, any>;
    expect(props["顧問先名"].title[0].text.content).toBe("テスト株式会社");
    expect(props["カテゴリ"].select.name).toBe("パートナー");
    expect(props["関係性ステータス"].select.name).toBe("契約中");
    expect(props["担当者名"].rich_text[0].text.content).toBe("田中一郎");
    expect(props["メールアドレス"].email).toBe("tanaka@test.example");
    expect(props["紹介元"].rich_text[0].text.content).toBe("株式会社アクメ");
    expect(props["契約開始日"].date.start).toBe("2026-06-20");
  });

  it("ログインIDを渡すとログインID列に設定する（未指定なら付けない）", () => {
    const withId = buildNotionProperties(partner, undefined, "LET-P-0001") as Record<string, any>;
    expect(withId["ログインID"].rich_text[0].text.content).toBe("LET-P-0001");
    const without = buildNotionProperties(partner) as Record<string, any>;
    expect(without["ログインID"]).toBeUndefined();
  });

  it("status を関係性ステータスへ変換する", () => {
    expect((buildNotionProperties({ ...partner, status: "dormant" }) as any)["関係性ステータス"].select.name).toBe("休止中");
    expect((buildNotionProperties({ ...partner, status: "suspended" }) as any)["関係性ステータス"].select.name).toBe("契約終了");
  });
});

describe("syncPartnerToNotion", () => {
  it("NOTION_TOKEN 未設定ならスタブとしてペイロードを返す", async () => {
    const prev = process.env.NOTION_TOKEN;
    delete process.env.NOTION_TOKEN;
    const res = await syncPartnerToNotion(partner);
    expect(res.ok).toBe(false);
    expect(res.payload.parent.database_id).toBe(NOTION_DATABASE_ID);
    expect(res.notionPageId).toBeUndefined();
    if (prev) process.env.NOTION_TOKEN = prev;
  });
});
