"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import clsx from "clsx";

export type Column = {
  key: string;
  header: string;
  align?: "left" | "right" | "center";
  sortable?: boolean; // default true
  sortValue?: (row: any) => string | number; // default row[key]
  render?: (row: any) => ReactNode; // default row[key]
};

export default function SortableTable({
  columns,
  rows,
  initialSortKey,
  initialDir = "asc",
  empty = "データがありません。",
}: {
  columns: Column[];
  rows: any[];
  initialSortKey?: string;
  initialDir?: "asc" | "desc";
  empty?: string;
}) {
  const [sortKey, setSortKey] = useState<string | undefined>(initialSortKey);
  const [dir, setDir] = useState<"asc" | "desc">(initialDir);

  const sorted = useMemo(() => {
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return rows;
    const sv = col.sortValue ?? ((r: any) => r[col.key]);
    const arr = [...rows];
    arr.sort((a, b) => {
      const av = sv(a) ?? "";
      const bv = sv(b) ?? "";
      let cmp: number;
      if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
      else cmp = String(av).localeCompare(String(bv), "ja");
      return dir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [rows, columns, sortKey, dir]);

  const onHeader = (c: Column) => {
    if (c.sortable === false) return;
    if (sortKey === c.key) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(c.key);
      setDir("asc");
    }
  };

  const alignCls = (a?: string) => (a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left");

  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-ink-muted border-b border-white/10">
            {columns.map((c) => (
              <th
                key={c.key}
                onClick={() => onHeader(c)}
                className={clsx(
                  "font-medium px-3 py-2.5 whitespace-nowrap select-none",
                  alignCls(c.align),
                  c.sortable !== false && "cursor-pointer hover:text-ink",
                )}
              >
                <span className={clsx("inline-flex items-center gap-1", c.align === "right" && "flex-row-reverse")}>
                  {c.header}
                  {sortKey === c.key &&
                    (dir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center text-ink-muted py-6 text-sm">
                {empty}
              </td>
            </tr>
          ) : (
            sorted.map((row, i) => (
              <tr key={row.id ?? i} className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.03]">
                {columns.map((c) => (
                  <td key={c.key} className={clsx("px-3 py-2.5", alignCls(c.align))}>
                    {c.render ? c.render(row) : (row[c.key] ?? "—")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
