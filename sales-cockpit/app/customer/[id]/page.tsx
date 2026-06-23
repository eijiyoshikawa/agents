import Link from "next/link";
import clsx from "clsx";
import { fetchCustomerById } from "@/lib/notion";
import { getFieldOptions } from "@/lib/data";
import { CustomerDetailBody, RANK_COLOR } from "@/components/CustomerDetailParts";

export const dynamic = "force-dynamic";

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [c, options] = await Promise.all([fetchCustomerById(id), getFieldOptions()]);

  if (!c) {
    return (
      <div className="card p-8 text-center text-sm text-ink-muted">
        顧客が見つかりませんでした。<Link href="/calls" className="text-brand-glow hover:underline ml-1">架電リストへ</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-bold text-ink">{c.name}</h1>
        {c.rank && <span className={clsx("chip", RANK_COLOR[c.rank] ?? "bg-white/10 text-slate-300")}>{c.rank}</span>}
        {c.status && <span className="chip bg-white/10 text-ink-soft">{c.status}</span>}
      </div>
      <div className="card p-5">
        <CustomerDetailBody c={c} options={options} />
      </div>
    </div>
  );
}
