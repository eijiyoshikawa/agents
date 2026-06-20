// パートナー（紹介会社）と紹介ツリー
// parentId = 紹介元。null ならルート（弊社が直接獲得したパートナー）。
import type { Partner } from "@/lib/types";

// 紹介ツリー:
//   acme (root)
//   ├─ blue
//   │  ├─ delta
//   │  └─ echo
//   └─ cosmos
//      └─ foxtrot
//   zen (root, 休眠)
export const partners: Partner[] = [
  {
    id: "p-acme",
    name: "株式会社アクメ",
    slug: "acme",
    parentId: null,
    referralCode: "ACME-2026",
    contact: { person: "山田太郎", email: "yamada@acme.example" },
    joinedAt: "2026-01-10",
    status: "active",
  },
  {
    id: "p-blue",
    name: "ブルースカイ合同会社",
    slug: "bluesky",
    parentId: "p-acme",
    referralCode: "BLUE-7781",
    contact: { person: "佐藤花子" },
    joinedAt: "2026-02-01",
    status: "active",
  },
  {
    id: "p-cosmos",
    name: "コスモス商事",
    slug: "cosmos",
    parentId: "p-acme",
    referralCode: "COSM-3120",
    joinedAt: "2026-02-15",
    status: "active",
  },
  {
    id: "p-delta",
    name: "デルタ・パートナーズ",
    slug: "delta",
    parentId: "p-blue",
    referralCode: "DLTA-5567",
    joinedAt: "2026-03-05",
    status: "active",
  },
  {
    id: "p-echo",
    name: "エコー企画",
    slug: "echo",
    parentId: "p-blue",
    referralCode: "ECHO-9043",
    joinedAt: "2026-03-20",
    status: "active",
  },
  {
    id: "p-foxtrot",
    name: "フォックストロット社",
    slug: "foxtrot",
    parentId: "p-cosmos",
    referralCode: "FOXT-1198",
    joinedAt: "2026-04-12",
    status: "active",
  },
  {
    id: "p-zen",
    name: "禅コンサルティング",
    slug: "zen",
    parentId: null,
    referralCode: "ZEN-0001",
    joinedAt: "2026-01-25",
    status: "dormant",
  },
];
