"use client";

import SortableTable, { type Column } from "./SortableTable";
import type { MonthlyHistoryRow } from "@/lib/aggregate";
import { yen, num } from "@/lib/format";

export default function MonthlyHistoryClient({ rows }: { rows: MonthlyHistoryRow[] }) {
  const columns: Column[] = [
    {
      key: "key",
      header: "月（締め）",
      sortValue: (r: MonthlyHistoryRow) => r.key,
      render: (r: MonthlyHistoryRow) => (
        <span>
          <span className="text-ink font-medium">{r.label}</span>
          <span className="text-ink-muted text-xs ml-1.5">{r.range}</span>
        </span>
      ),
    },
    { key: "appointments", header: "アポ獲得", align: "right", render: (r: MonthlyHistoryRow) => num(r.appointments) },
    { key: "newContracts", header: "新規契約", align: "right", render: (r: MonthlyHistoryRow) => num(r.newContracts) },
    { key: "activeContracts", header: "稼働契約", align: "right", render: (r: MonthlyHistoryRow) => num(r.activeContracts) },
    {
      key: "mrr",
      header: "MRR",
      align: "right",
      render: (r: MonthlyHistoryRow) => <span className="text-brand tabular-nums">{yen(r.mrr)}</span>,
    },
    {
      key: "calls",
      header: "架電",
      align: "right",
      sortValue: (r: MonthlyHistoryRow) => (r.calls ?? -1),
      render: (r: MonthlyHistoryRow) =>
        r.calls == null ? <span className="text-ink-muted" title="架電記録ログ運用開始前のためデータなし">—</span> : num(r.calls),
    },
  ];
  return (
    <SortableTable
      columns={columns}
      rows={rows.map((r) => ({ ...r, id: r.key }))}
      initialSortKey="key"
      initialDir="desc"
      empty="実績データがありません。"
    />
  );
}
