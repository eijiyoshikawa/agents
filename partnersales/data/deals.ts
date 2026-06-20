// クライアント契約（成約）
// introducerPartnerId = クライアントを紹介したパートナー（tier1 受領者）。
// 報酬確定タイミングは status を手動で pending → confirmed → paid に更新して管理する。
import type { Deal } from "@/lib/types";

export const deals: Deal[] = [
  // delta が紹介 → tier1 delta(10%), tier2 blue(3%), tier3 acme(2%)
  {
    id: "d-001",
    serviceId: "svc-sns",
    clientName: "美容サロンチェーンX",
    introducerPartnerId: "p-delta",
    amount: 1000000,
    status: "paid",
    closedAt: "2026-05-02",
  },
  // echo が紹介（固定額プラン）→ tier1 echo, tier2 blue, tier3 acme
  {
    id: "d-002",
    serviceId: "svc-web",
    clientName: "工務店Y",
    introducerPartnerId: "p-echo",
    amount: 800000,
    status: "confirmed",
    closedAt: "2026-05-18",
  },
  // foxtrot が紹介 → tier1 foxtrot, tier2 cosmos, tier3 acme
  {
    id: "d-003",
    serviceId: "svc-bpo",
    clientName: "不動産会社Z",
    introducerPartnerId: "p-foxtrot",
    amount: 500000,
    status: "confirmed",
    closedAt: "2026-06-01",
  },
  // blue が紹介（弊社の直接パートナー）→ tier1 blue, tier2 acme（3段目なし）
  {
    id: "d-004",
    serviceId: "svc-sns",
    clientName: "美容クリニックW",
    introducerPartnerId: "p-blue",
    amount: 450000,
    status: "pending",
    closedAt: "2026-06-15",
    note: "見込み案件",
  },
  // 自己成約: delta 自身が弊社と契約 → tier1(delta) は出さない。tier2 blue, tier3 acme は支払う
  {
    id: "d-005",
    serviceId: "svc-sns",
    clientName: "デルタ・パートナーズ（自社利用）",
    introducerPartnerId: "p-delta",
    amount: 1000000,
    status: "paid",
    closedAt: "2026-04-20",
    isSelfDeal: true,
    note: "自己成約（tier1なし）",
  },
];
