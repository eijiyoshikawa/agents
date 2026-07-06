"use client";

import Link from "next/link";
import SortableTable, { type Column } from "./SortableTable";
import CallButton from "./CallButton";

export type FollowRow = {
  id: string;
  name: string;
  url: string;
  phone: string | null;
  status: string | null;
  nextFollow: string | null;
  isRep: string | null;
};

export default function FollowupsClient({ rows, today }: { rows: FollowRow[]; today: string }) {
  const columns: Column[] = [
    {
      key: "name",
      header: "会社名",
      sortValue: (r: FollowRow) => r.name,
      render: (r: FollowRow) => (
        <div className="max-w-64 truncate">
          <Link href={`/customer/${r.id}`} className="text-ink hover:text-brand-glow hover:underline">
            {r.name}
          </Link>
          {r.phone && <div className="text-xs text-ink-muted font-mono">{r.phone}</div>}
        </div>
      ),
    },
    { key: "status", header: "ステータス", render: (r) => r.status ?? "—" },
    {
      key: "nextFollow",
      header: "次回フォロー日",
      sortValue: (r: FollowRow) => r.nextFollow ?? "9999",
      render: (r: FollowRow) => {
        const due = r.nextFollow && r.nextFollow.slice(0, 10) <= today;
        return <span className={due ? "text-accent-red font-medium" : "text-ink-muted"}>{r.nextFollow?.slice(0, 10) ?? "—"}</span>;
      },
    },
    { key: "isRep", header: "IS担当", render: (r) => r.isRep ?? "—" },
    {
      key: "action",
      header: "発信 / 記録",
      align: "right",
      sortable: false,
      render: (r: FollowRow) => (
        <div className="inline-flex items-center gap-2">
          {r.phone && <CallButton phone={r.phone} />}
          <Link href={`/customer/${r.id}`} className="text-xs text-brand-glow hover:underline">
            開く
          </Link>
        </div>
      ),
    },
  ];
  return <SortableTable columns={columns} rows={rows} initialSortKey="nextFollow" initialDir="asc" />;
}
