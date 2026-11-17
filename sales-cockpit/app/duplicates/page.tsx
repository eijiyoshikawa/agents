import { getCustomers } from "@/lib/data";
import { duplicateGroups } from "@/lib/leadflags";
import DuplicatesClient, { type DupGroup } from "@/components/DuplicatesClient";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export default async function DuplicatesPage() {
  const { customers, errors } = await getCustomers();
  const groups = duplicateGroups(customers).slice(0, 300);
  const slim: DupGroup[] = groups.map((g) => ({
    reason: g.reason,
    key: g.key,
    members: g.members.map((m) => ({
      id: m.id,
      name: m.name,
      url: m.url,
      status: m.status,
      phone: m.phone,
      isRep: m.isRep,
      confirm: m.confirm,
      callCount: m.callCount,
      address: m.address,
    })),
  }));
  const totalDup = groups.reduce((s, g) => s + g.members.length, 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-ink">重複チェック（被りチェック）</h1>
        <p className="text-xs text-ink-muted mt-0.5">
          会社名（法人格除去）または電話番号が一致する候補。{groups.length} グループ・{totalDup} 件（上位300グループを表示）。
          同じ会社なら「残す」を選んで「1つにまとめる」（架電記録などの紐付け・メモも残す側へ移し、ほかは Notion のゴミ箱へ。30日は戻せます）。
          別の会社なら「別会社（重複ではない）」を押すと候補から外れます。
        </p>
      </div>

      {errors.length > 0 && (
        <div className="card p-4 ring-accent-amber/30 bg-accent-amber/5 text-xs text-ink-soft">{errors.join(" / ")}</div>
      )}

      <DuplicatesClient groups={slim} />
    </div>
  );
}
