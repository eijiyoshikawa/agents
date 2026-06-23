"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { yen, num } from "@/lib/format";
import SortableTable, { type Column } from "./SortableTable";

export type MrrRow = {
  id: string;
  name: string;
  custId: string | null;
  isRep: string | null;
  sRep: string | null;
  status: string | null;
  kinds: string;
  start: string;
  monthly: number;
};

type Drill = { title: string; rows: MrrRow[] } | null;

export default function MrrClient({ rows }: { rows: MrrRow[] }) {
  const [drill, setDrill] = useState<Drill>(null);

  const group = (keyOf: (r: MrrRow) => string) => {
    const m = new Map<string, { mrr: number; count: number }>();
    for (const r of rows) {
      const k = keyOf(r) || "未割当";
      const v = m.get(k) ?? { mrr: 0, count: 0 };
      v.mrr += r.monthly;
      v.count += 1;
      m.set(k, v);
    }
    return [...m.entries()].map(([rep, v]) => ({ rep, ...v })).sort((a, b) => b.mrr - a.mrr);
  };
  const sCards = useMemo(() => group((r) => r.sRep ?? "未割当"), [rows]);
  const isCards = useMemo(() => group((r) => r.isRep ?? "未割当"), [rows]);

  const openS = (rep: string) => setDrill({ title: `S担当: ${rep}`, rows: rows.filter((r) => (r.sRep ?? "未割当") === rep) });
  const openIS = (rep: string) => setDrill({ title: `IS担当: ${rep}`, rows: rows.filter((r) => (r.isRep ?? "未割当") === rep) });

  const columns: Column[] = [
    {
      key: "name",
      header: "契約名",
      render: (r: MrrRow) =>
        r.custId ? (
          <Link href={`/customer/${r.custId}`} className="text-ink hover:text-brand-glow hover:underline">
            {r.name}
          </Link>
        ) : (
          <span className="text-ink">{r.name}</span>
        ),
    },
    { key: "sRep", header: "S担当", render: (r) => r.sRep ?? "—" },
    { key: "isRep", header: "IS担当", render: (r) => r.isRep ?? "—" },
    { key: "status", header: "ステータス", render: (r) => r.status ?? "—" },
    { key: "kinds", header: "種別", render: (r) => r.kinds || "—" },
    { key: "start", header: "開始日", render: (r) => r.start || "—" },
    { key: "monthly", header: "月額", align: "right", render: (r: MrrRow) => yen(r.monthly) },
  ];

  return (
    <>
      <RepCards title="S担当別 MRR（クリックで内訳）" cards={sCards} onPick={openS} />
      <RepCards title="IS担当別 MRR（契約→顧客の担当・クリックで内訳）" cards={isCards} onPick={openIS} />
      <SortableTable columns={columns} rows={rows} initialSortKey="monthly" initialDir="desc" />
      {drill && <DrillPanel drill={drill} onClose={() => setDrill(null)} />}
    </>
  );
}

function RepCards({
  title,
  cards,
  onPick,
}: {
  title: string;
  cards: { rep: string; mrr: number; count: number }[];
  onPick: (rep: string) => void;
}) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-ink mb-2">{title}</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((r) => (
          <button
            key={r.rep}
            onClick={() => onPick(r.rep)}
            className="card p-4 text-left hover:ring-white/20 transition-shadow"
          >
            <div className="text-xs font-medium text-ink-muted flex items-center justify-between">
              {r.rep}
              <span className="text-[10px] text-ink-muted/70">内訳 ›</span>
            </div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-brand">{yen(r.mrr)}</div>
            <div className="mt-0.5 text-xs text-ink-muted">{r.count} 契約</div>
          </button>
        ))}
      </div>
    </section>
  );
}

function DrillPanel({ drill, onClose }: { drill: { title: string; rows: MrrRow[] }; onClose: () => void }) {
  const total = drill.rows.reduce((s, r) => s + r.monthly, 0);
  return (
    <div className="fixed inset-0 z-30 flex justify-end bg-black/40" onClick={onClose}>
      <div className="w-full max-w-2xl h-full bg-night-1 border-l border-white/10 shadow-lift overflow-y-auto animate-fadeIn" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-night-1/95 backdrop-blur border-b border-white/10 px-5 py-3 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-ink">{drill.title}</h3>
            <p className="text-xs text-ink-muted">{drill.rows.length} 契約 ・ {yen(total)}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-ink-muted hover:bg-white/10">
            <X size={18} />
          </button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-ink-muted border-b border-white/10">
              <th className="text-left font-medium px-5 py-2">契約名</th>
              <th className="text-left font-medium px-2 py-2">ステータス</th>
              <th className="text-right font-medium px-5 py-2">月額</th>
            </tr>
          </thead>
          <tbody>
            {drill.rows.map((r) => (
              <tr key={r.id} className="border-b border-white/[0.06]">
                <td className="px-5 py-2 max-w-72 truncate">
                  {r.custId ? (
                    <Link href={`/customer/${r.custId}`} className="hover:text-brand-glow hover:underline">
                      {r.name}
                    </Link>
                  ) : (
                    r.name
                  )}
                </td>
                <td className="px-2 py-2 text-xs text-ink-soft">{r.status ?? "—"}</td>
                <td className="px-5 py-2 text-right tabular-nums">{yen(r.monthly)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
