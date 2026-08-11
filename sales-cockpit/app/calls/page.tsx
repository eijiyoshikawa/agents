import { searchCustomers, getFieldOptions } from "@/lib/data";
import CustomerTable, { type InitialFilters } from "@/components/CustomerTable";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 大量レコード取得に備えタイムアウトを延長

function str(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

export default async function CallsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const initial: InitialFilters = {
    q: str(sp.q),
    rep: str(sp.rep),
    status: str(sp.status),
    rank: str(sp.rank),
    industry: str(sp.industry),
  };
  const [{ result, errors }, options] = await Promise.all([
    searchCustomers({ ...initial, sort: "lastCallDate", dir: "desc", page: 1, pageSize: 50 }),
    getFieldOptions(),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-ink">架電リスト・発信</h1>
        <p className="text-xs text-ink-muted mt-0.5">
          行をクリックで詳細・架電フック・メモ。電話番号の「発信」で OS既定の電話アプリ（Zoom Phone等）で発信します。
        </p>
      </div>

      {errors.length > 0 && (
        <div className="card p-4 ring-accent-amber/30 bg-accent-amber/5 text-xs text-ink-soft">{errors.join(" / ")}</div>
      )}

      <CustomerTable initial={initial} options={options} initialData={result} />
    </div>
  );
}
