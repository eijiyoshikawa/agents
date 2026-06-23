import { getFollowups } from "@/lib/data";
import FollowupsClient, { type FollowRow } from "@/components/FollowupsClient";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export default async function FollowupsPage() {
  const { customers, errors } = await getFollowups();
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
  const rows: FollowRow[] = customers.map((c) => ({
    id: c.id,
    name: c.name,
    url: c.url,
    phone: c.phone,
    status: c.status,
    nextFollow: c.nextFollow,
    isRep: c.isRep,
  }));
  const overdue = rows.filter((c) => c.nextFollow && c.nextFollow.slice(0, 10) <= today).length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-ink">フォロー / 再コール</h1>
        <p className="text-xs text-ink-muted mt-0.5">
          「再コール」または「次回フォロー日」が設定された顧客。{rows.length} 件・期限到来 {overdue} 件。列ヘッダーで並び替え可。
        </p>
      </div>

      {errors.length > 0 && (
        <div className="card p-4 ring-accent-amber/30 bg-accent-amber/5 text-xs text-ink-soft">{errors.join(" / ")}</div>
      )}

      <FollowupsClient rows={rows} today={today} />
    </div>
  );
}
