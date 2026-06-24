// サーバー側で全件配列を絞り込み・並べ替え・ページングする（クライアントへ1ページだけ返すため）。
import type { ListCustomer, SearchParams, SearchResult, SearchRow } from "./types";
import { computeDuplicates, agencyReason } from "./leadflags";

const SORT_VAL: Record<string, (c: ListCustomer) => string | number> = {
  name: (c) => c.name,
  status: (c) => c.status ?? "",
  rank: (c) => c.rank ?? "",
  industry: (c) => c.industry ?? "",
  isRep: (c) => c.isRep ?? "",
  callCount: (c) => c.callCount ?? 0,
  lastCallDate: (c) => c.lastCallDate ?? "",
};

export function searchInMemory(all: ListCustomer[], p: SearchParams): SearchResult {
  const dup = computeDuplicates(all);
  const agency = new Map<string, string>();
  for (const c of all) {
    const r = agencyReason(c);
    if (r) agency.set(c.id, r);
  }

  const q = (p.q ?? "").trim().toLowerCase();
  const filtered = all.filter((c) => {
    if (p.rep) {
      if (p.rep === "__none__" ? !!c.isRep : c.isRep !== p.rep) return false;
    }
    if (p.status) {
      if (p.status === "__none__" ? !!c.status : c.status !== p.status) return false;
    }
    if (p.rank && c.rank !== p.rank) return false;
    if (p.industry && c.industry !== p.industry) return false;
    if (q && !(c.name.toLowerCase().includes(q) || (c.phone ?? "").includes(q))) return false;
    if (p.dupOnly && !dup.dupIds.has(c.id)) return false;
    if (p.agencyMode === "exclude" && agency.has(c.id)) return false;
    if (p.agencyMode === "only" && !agency.has(c.id)) return false;
    return true;
  });

  const totalDup = filtered.reduce((n, c) => n + (dup.dupIds.has(c.id) ? 1 : 0), 0);
  const totalAgency = filtered.reduce((n, c) => n + (agency.has(c.id) ? 1 : 0), 0);

  const sortKey = p.sort && SORT_VAL[p.sort] ? p.sort : "lastCallDate";
  const dir = p.dir === "asc" ? 1 : -1;
  const f = SORT_VAL[sortKey];
  filtered.sort((a, b) => {
    const av = f(a);
    const bv = f(b);
    const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv), "ja");
    return cmp * dir;
  });

  const total = filtered.length;
  const pageSize = Math.min(Math.max(p.pageSize ?? 50, 1), 200);
  const page = Math.max(p.page ?? 1, 1);
  const start = (page - 1) * pageSize;
  const rows: SearchRow[] = filtered.slice(start, start + pageSize).map((c) => ({
    ...c,
    dup: dup.dupIds.has(c.id),
    agency: agency.get(c.id) ?? null,
  }));
  return { rows, total, totalDup, totalAgency, page, pageSize };
}
