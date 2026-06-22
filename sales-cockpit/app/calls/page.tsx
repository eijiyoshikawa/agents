import { getCustomers } from "@/lib/data";
import CustomerTable from "@/components/CustomerTable";

export const dynamic = "force-dynamic";

export default async function CallsPage() {
  const { customers, errors } = await getCustomers();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-ink">架電リスト・発信</h1>
        <p className="text-xs text-ink-muted mt-0.5">
          電話番号の「発信」をクリックすると、OS既定の電話アプリ（Zoom Phone を既定にすれば Zoom）で発信します。
        </p>
      </div>

      {errors.length > 0 && (
        <div className="card p-4 ring-accent-amber/30 bg-accent-amber/5 text-xs text-ink-soft">
          {errors.join(" / ")}
        </div>
      )}

      <CustomerTable customers={customers} />
    </div>
  );
}
