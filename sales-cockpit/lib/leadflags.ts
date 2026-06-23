import type { Customer } from "./types";

// 無課金・ルールベースの「被りチェック」と「人材紹介会社フラグ」。

// ── 正規化 ───────────────────────────────────────────────────────
const ENTITY = /(株式会社|有限会社|合同会社|合名会社|合資会社|一般社団法人|一般財団法人|公益社団法人|公益財団法人|医療法人|学校法人|社会福祉法人|宗教法人|特定非営利活動法人|npo法人)/g;

export function normalizeCompanyName(name: string | null): string {
  if (!name) return "";
  let s = name.normalize("NFKC").toLowerCase();
  s = s.replace(ENTITY, "");
  s = s.replace(/[（）()\[\]【】「」『』\s・,，.。･\-ー―−~〜_/／]/g, "");
  return s.trim();
}

export function normalizePhone(phone: string | null): string {
  if (!phone) return "";
  return phone.normalize("NFKC").replace(/\D/g, "");
}

// ── 被りチェック ─────────────────────────────────────────────────
export type DuplicateInfo = {
  dupIds: Set<string>;
  partners: Map<string, string[]>; // id -> 重複相手の表示文字列
};

export function computeDuplicates(customers: Customer[]): DuplicateInfo {
  const byName = new Map<string, Customer[]>();
  const byPhone = new Map<string, Customer[]>();
  for (const c of customers) {
    const n = normalizeCompanyName(c.name);
    if (n) (byName.get(n) ?? byName.set(n, []).get(n)!).push(c);
    const p = normalizePhone(c.phone);
    if (p.length >= 9) (byPhone.get(p) ?? byPhone.set(p, []).get(p)!).push(c);
  }

  const dupIds = new Set<string>();
  const partners = new Map<string, Set<string>>();
  const addGroup = (group: Customer[], how: string) => {
    if (group.length < 2) return;
    for (const c of group) {
      dupIds.add(c.id);
      const set = partners.get(c.id) ?? new Set<string>();
      for (const o of group) {
        if (o.id !== c.id) set.add(`${o.name}（${how}${o.phone ? `・${o.phone}` : ""}）`);
      }
      partners.set(c.id, set);
    }
  };
  for (const g of byName.values()) addGroup(g, "同名");
  for (const g of byPhone.values()) addGroup(g, "同電話");

  const out = new Map<string, string[]>();
  for (const [id, set] of partners) out.set(id, [...set]);
  return { dupIds, partners: out };
}

/** 重複グループ（同名 or 同電話で2件以上）。レビュー用。 */
export function duplicateGroups(customers: Customer[]): { reason: string; key: string; members: Customer[] }[] {
  const byName = new Map<string, Customer[]>();
  const byPhone = new Map<string, Customer[]>();
  for (const c of customers) {
    const n = normalizeCompanyName(c.name);
    if (n) (byName.get(n) ?? byName.set(n, []).get(n)!).push(c);
    const p = normalizePhone(c.phone);
    if (p.length >= 9) (byPhone.get(p) ?? byPhone.set(p, []).get(p)!).push(c);
  }
  const seen = new Set<string>();
  const groups: { reason: string; key: string; members: Customer[] }[] = [];
  for (const [k, members] of byName) {
    if (members.length < 2) continue;
    groups.push({ reason: "同名", key: `name:${k}`, members });
    for (const m of members) seen.add(m.id);
  }
  for (const [k, members] of byPhone) {
    if (members.length < 2) continue;
    // 同名グループで既に拾った組み合わせは省く（電話のみの重複を追加）
    if (members.every((m) => seen.has(m.id))) continue;
    groups.push({ reason: "同電話", key: `phone:${k}`, members });
  }
  return groups.sort((a, b) => b.members.length - a.members.length);
}

// ── 人材紹介会社フラグ ───────────────────────────────────────────
const AGENCY_KEYWORDS = [
  "人材", "人財", "派遣", "紹介", "キャリア", "スタッフ", "ワークス", "エージェント", "エージェンシー",
  "リクルート", "求人", "ジョブ", "ヒューマンリソース", "ヒューマン", "アウトソーシング", "パーソル",
  "マイナビ", "リソーシング", "リソース", "career", "staff", "works", "agency", "agent", "recruit",
  "job", "resource", "personnel", "outsourc",
];

/** 人材紹介会社らしさの根拠（無ければ null）。建設業種でも社名で判定するのが狙い。 */
export function agencyReason(c: Customer): string | null {
  if (c.industry === "人材") return "業種=人材";
  const s = (c.name ?? "").normalize("NFKC").toLowerCase();
  for (const k of AGENCY_KEYWORDS) {
    if (s.includes(k.toLowerCase())) return `社名に「${k}」`;
  }
  return null;
}
