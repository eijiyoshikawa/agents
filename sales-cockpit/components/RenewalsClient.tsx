"use client";

import SortableTable, { type Column } from "./SortableTable";
import { yen } from "@/lib/format";

export type RenewalRow = {
  id: string;
  name: string;
  nextRenewal: string | null;
  churnRisk: string | null;
  health: string | null;
  csRep: string | null;
  monthly: number;
};

const RISK_ORDER: Record<string, number> = { 高: 3, 中: 2, 低: 1 };
const RISK_COLOR: Record<string, string> = { 高: "text-accent-red font-medium", 中: "text-accent-amber", 低: "text-ink-muted" };

export default function RenewalsClient({ rows, soonDate }: { rows: RenewalRow[]; soonDate: string }) {
  const columns: Column[] = [
    { key: "name", header: "契約名", render: (r: RenewalRow) => <span className="max-w-72 truncate inline-block text-ink">{r.name}</span> },
    {
      key: "nextRenewal",
      header: "次回更新日",
      sortValue: (r: RenewalRow) => r.nextRenewal ?? "9999",
      render: (r: RenewalRow) => {
        const due = r.nextRenewal && r.nextRenewal.slice(0, 10) <= soonDate;
        return <span className={due ? "text-accent-red font-medium" : "text-ink-muted"}>{r.nextRenewal?.slice(0, 10) ?? "—"}</span>;
      },
    },
    {
      key: "churnRisk",
      header: "解約リスク",
      sortValue: (r: RenewalRow) => RISK_ORDER[r.churnRisk ?? ""] ?? 0,
      render: (r: RenewalRow) => <span className={RISK_COLOR[r.churnRisk ?? ""] ?? "text-ink-muted"}>{r.churnRisk ?? "—"}</span>,
    },
    { key: "health", header: "健全性", render: (r) => r.health ?? "—" },
    { key: "csRep", header: "CS担当", render: (r) => r.csRep ?? "—" },
    { key: "monthly", header: "月額", align: "right", render: (r: RenewalRow) => yen(r.monthly) },
  ];
  return <SortableTable columns={columns} rows={rows} initialSortKey="nextRenewal" initialDir="asc" empty="対象がありません。" />;
}
