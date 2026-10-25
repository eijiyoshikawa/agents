import { getContracts, getMrrCustomerLinks } from "@/lib/data";
import { yen, num } from "@/lib/format";
import MrrClient, { type MrrRow } from "@/components/MrrClient";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const ACTIVE = new Set(["試用期間", "契約中", "更新待ち"]);

function companyFromContract(name: string): string {
  return name.split(/[｜|]/)[0].trim();
}

export default async function MrrPage() {
  const { contracts, errors } = await getContracts();
  const active = contracts.filter((c) => c.status && ACTIVE.has(c.status));

  // 契約→顧客の紐付け（①relation ②同名フォールバック）。Notion を契約数ぶん引くためキャッシュ経由（lib/data.ts）
  const links = await getMrrCustomerLinks(
    active.map((c) => ({ id: c.id, customerId: c.customerId, company: companyFromContract(c.name) })),
  );

  const rows: MrrRow[] = active.map((c) => {
    const cust = links[c.id];
    return {
      id: c.id,
      name: c.name,
      custId: cust?.custId ?? null,
      isRep: cust?.isRep ?? null,
      sRep: c.sRep,
      status: c.status,
      kinds: c.kinds.join("・"),
      start: c.start?.slice(0, 10) ?? "",
      monthly: c.monthly,
    };
  });
  const totalMrr = active.reduce((s, c) => s + c.monthly, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink">MRR（担当者別）</h1>
        <p className="text-xs text-ink-muted mt-0.5">
          稼働中（試用期間・契約中・更新待ち）の月額を集計。全社MRR {yen(totalMrr)}・{num(active.length)}契約。担当カードや列ヘッダーで並び替え・内訳が見られます。
        </p>
      </div>

      {errors.length > 0 && (
        <div className="card p-4 ring-accent-amber/30 bg-accent-amber/5 text-xs text-ink-soft">{errors.join(" / ")}</div>
      )}

      <MrrClient rows={rows} />
    </div>
  );
}
