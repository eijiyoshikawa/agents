import Link from "next/link";
import { getFollowups } from "@/lib/data";
import CallButton from "@/components/CallButton";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export default async function FollowupsPage() {
  const { customers, errors } = await getFollowups();
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
  const rows = [...customers].sort((a, b) => (a.nextFollow ?? "9999").localeCompare(b.nextFollow ?? "9999"));
  const overdue = rows.filter((c) => c.nextFollow && c.nextFollow.slice(0, 10) <= today).length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-ink">フォロー / 再コール</h1>
        <p className="text-xs text-ink-muted mt-0.5">
          「再コール」または「次回フォロー日」が設定された顧客。{rows.length} 件・期限到来 {overdue} 件。
        </p>
      </div>

      {errors.length > 0 && (
        <div className="card p-4 ring-accent-amber/30 bg-accent-amber/5 text-xs text-ink-soft">{errors.join(" / ")}</div>
      )}

      {rows.length === 0 ? (
        <div className="card p-8 text-center text-sm text-ink-muted">対象はありません。</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-ink-muted border-b border-white/10">
                <th className="text-left font-medium px-4 py-2.5">会社名</th>
                <th className="text-left font-medium px-3 py-2.5">ステータス</th>
                <th className="text-left font-medium px-3 py-2.5">次回フォロー日</th>
                <th className="text-left font-medium px-3 py-2.5">IS担当</th>
                <th className="text-right font-medium px-4 py-2.5">発信 / 記録</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const due = c.nextFollow && c.nextFollow.slice(0, 10) <= today;
                return (
                  <tr key={c.id} className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.03]">
                    <td className="px-4 py-2.5 text-ink max-w-64 truncate">
                      <a href={c.url} target="_blank" rel="noreferrer" className="hover:text-brand-glow hover:underline">
                        {c.name}
                      </a>
                      {c.phone && <div className="text-xs text-ink-muted font-mono">{c.phone}</div>}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-ink-soft">{c.status ?? "—"}</td>
                    <td className={`px-3 py-2.5 text-xs ${due ? "text-accent-red font-medium" : "text-ink-muted"}`}>
                      {c.nextFollow?.slice(0, 10) ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-ink-soft">{c.isRep ?? "—"}</td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="inline-flex items-center gap-2">
                        {c.phone && <CallButton phone={c.phone} />}
                        <Link href={`/calls?q=${encodeURIComponent(c.name)}`} className="text-xs text-brand-glow hover:underline">
                          開く
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
