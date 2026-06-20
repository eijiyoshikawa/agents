// 支払い精算レコード（サンプル）
// 弊社からの銀行振込のみ。請求書受領(invoiced) → 振込完了(paid)。
import type { Payout } from "@/lib/types";

export const payouts: Payout[] = [
  // 例: アクメへ過去に一部振込済み
  {
    id: "po-001",
    partnerId: "p-acme",
    amount: 30000,
    status: "paid",
    invoiceNo: "INV-2026-031",
    invoicedAt: "2026-05-25",
    paidAt: "2026-05-31",
  },
];
