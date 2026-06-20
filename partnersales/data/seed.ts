// サンプルシードデータ（事前準備フェーズ用）
// 本番では Supabase 等の永続層に置き換える。
import type { Deal, Partner, Service } from "@/lib/types";

export const services: Service[] = [
  {
    id: "svc-sns",
    name: "SNSマーケティング運用",
    description: "Instagram / TikTok / YouTube の運用代行",
    unitPrice: 300000,
    active: true,
    rewards: [
      { tier: 1, type: "percentage", rate: 0.15 },
      { tier: 2, type: "percentage", rate: 0.05 },
      { tier: 3, type: "percentage", rate: 0.02 },
    ],
  },
  {
    id: "svc-bpo",
    name: "不動産BPO",
    description: "不動産業界特化型のBPOパッケージ",
    unitPrice: 500000,
    active: true,
    rewards: [
      { tier: 1, type: "percentage", rate: 0.1 },
      { tier: 2, type: "percentage", rate: 0.04 },
      { tier: 3, type: "percentage", rate: 0.02 },
    ],
  },
  {
    id: "svc-web",
    name: "LP・Web制作",
    description: "Next.js による高速LP・コーポレートサイト制作",
    unitPrice: 800000,
    active: true,
    rewards: [
      { tier: 1, type: "fixed", fixedAmount: 80000 },
      { tier: 2, type: "fixed", fixedAmount: 30000 },
      { tier: 3, type: "fixed", fixedAmount: 10000 },
    ],
  },
];

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

export const deals: Deal[] = [
  // delta が成約 → tier1 delta, tier2 blue, tier3 acme
  {
    id: "d-001",
    serviceId: "svc-sns",
    partnerId: "p-delta",
    amount: 300000,
    status: "paid",
    closedAt: "2026-05-02",
    note: "美容サロンチェーン",
  },
  // echo が成約 → tier1 echo, tier2 blue, tier3 acme
  {
    id: "d-002",
    serviceId: "svc-web",
    partnerId: "p-echo",
    amount: 800000,
    status: "confirmed",
    closedAt: "2026-05-18",
  },
  // foxtrot が成約 → tier1 foxtrot, tier2 cosmos, tier3 acme
  {
    id: "d-003",
    serviceId: "svc-bpo",
    partnerId: "p-foxtrot",
    amount: 500000,
    status: "confirmed",
    closedAt: "2026-06-01",
  },
  // blue 自己成約 → tier1 blue, tier2 acme（3段目なし）
  {
    id: "d-004",
    serviceId: "svc-sns",
    partnerId: "p-blue",
    amount: 450000,
    status: "pending",
    closedAt: "2026-06-15",
    note: "見込み案件",
  },
  // acme 自己成約 → tier1 acme のみ
  {
    id: "d-005",
    serviceId: "svc-web",
    partnerId: "p-acme",
    amount: 800000,
    status: "paid",
    closedAt: "2026-04-20",
  },
];
