/**
 * 顧客管理DBの重複をまとめる（2026-11-17 代表承認）。
 *
 * 自動でまとめるのは「会社名が同じ（法人格・空白を除いて一致）」「電話番号が食い違わない」グループのうち、
 * 1件を除いて手つかず（ステータス空 or アプローチ前・コール数 0・メモ空・架電/商談/契約などの紐付けなし）のものだけ。
 * 残す1件に、消す側にしか入っていない項目（電話・住所・URL など）を写してから、消す側を Notion のゴミ箱に入れる（30日は戻せる）。
 * 実行直前に Notion のページを読み直して、手つかずでなくなっていたら触らない。
 *
 * 人が選んで「1つにまとめる」場合は、架電記録・商談記録・契約などの紐付けも残す側に付け替え、メモを追記する。
 */
import { Client } from "@notionhq/client";
import { normalizeCompanyName, normalizePhone } from "./leadflags";
import type { ListCustomer } from "./types";

// ---------------------------------------------------------------- 計画（純粋関数）

export type AutoMergePlan = { key: string; name: string; keepId: string; removeIds: string[] };

const UNTOUCHED_STATUSES = new Set(["", "アプローチ前"]);

/** 一覧の控えだけで判断できる「手つかず」らしさ（最終確認は Notion を読み直して行う） */
export function looksUntouched(c: Pick<ListCustomer, "status" | "callCount" | "lastCallDate" | "appointmentDate">): boolean {
  return UNTOUCHED_STATUSES.has(c.status ?? "") && !(c.callCount ?? 0) && !c.lastCallDate && !c.appointmentDate;
}

/** 埋まっている項目の多さ（残す側を選ぶときの目安） */
function filled(c: ListCustomer): number {
  return [c.phone, c.address, c.industry, c.phase, c.employees, c.isRep, c.sRep, c.rank, c.method, c.pref].filter((v) => v !== null && v !== undefined && v !== "").length + c.media.length;
}

export function planAutoMerges(customers: ListCustomer[], skip: Set<string> = new Set()): AutoMergePlan[] {
  const groups = new Map<string, ListCustomer[]>();
  for (const c of customers) {
    if (c.confirm === "OK") continue;
    const k = normalizeCompanyName(c.name);
    if (!k) continue;
    (groups.get(k) ?? groups.set(k, []).get(k)!).push(c);
  }
  const plans: AutoMergePlan[] = [];
  for (const [k, members] of groups) {
    if (members.length < 2 || skip.has(`name:${k}`)) continue;
    const phones = new Set(members.map((m) => normalizePhone(m.phone)).filter((p) => p.length >= 9));
    if (phones.size > 1) continue; // 電話番号が違う → 支店や別会社かもしれないので人が判断
    const touched = members.filter((m) => !looksUntouched(m));
    if (touched.length > 1) continue; // 両方に履歴がある → 人が判断
    const keep = touched[0] ?? [...members].sort((a, b) => filled(b) - filled(a) || (a.lastEdited ?? "").localeCompare(b.lastEdited ?? ""))[0];
    plans.push({ key: `name:${k}`, name: keep.name, keepId: keep.id, removeIds: members.filter((m) => m.id !== keep.id).map((m) => m.id) });
  }
  return plans.sort((a, b) => a.name.localeCompare(b.name, "ja"));
}

// ---------------------------------------------------------------- Notion への反映

type Prop = Record<string, any> & { type: string; id: string };
type Page = { id: string; properties: Record<string, Prop>; in_trash?: boolean; archived?: boolean };

/** 写さない項目（確認・作業用のフラグ、タイトル、システム項目） */
const NO_COPY = new Set(["確認状況", "重複確認必要", "訪問候補", "ステータス"]);
/** 「手つかず」の判定に使う紐付け */
const ACTIVITY_RELATIONS = ["架電記録", "商談記録", "契約情報", "解約記録", "案件", "関連打ち合わせ", "求人"];

const isEmpty = (p: Prop | undefined): boolean => {
  if (!p) return true;
  switch (p.type) {
    case "rich_text":
      return !p.rich_text?.length;
    case "phone_number":
    case "url":
    case "email":
    case "number":
      return p[p.type] === null || p[p.type] === "";
    case "select":
      return !p.select;
    case "multi_select":
      return !p.multi_select?.length;
    case "date":
      return !p.date;
    case "relation":
      return !p.relation?.length;
    default:
      return true;
  }
};

const plain = (p: Prop | undefined) => (p?.rich_text ?? p?.title ?? []).map((t: any) => t.plain_text).join("");

/** 書き込み用の値（読み取った形 → 更新の形） */
function writable(p: Prop): Record<string, unknown> | null {
  switch (p.type) {
    case "rich_text":
      return { rich_text: p.rich_text.map((t: any) => ({ type: "text", text: { content: t.plain_text } })) };
    case "phone_number":
    case "url":
    case "email":
    case "number":
      return { [p.type]: p[p.type] };
    case "select":
      return { select: { name: p.select.name } };
    case "multi_select":
      return { multi_select: p.multi_select.map((o: any) => ({ name: o.name })) };
    case "date":
      return { date: { start: p.date.start, end: p.date.end ?? undefined } };
    default:
      return null;
  }
}

async function relationIds(client: Client, page: Page, name: string): Promise<string[]> {
  const p = page.properties[name];
  if (!p || p.type !== "relation") return [];
  if (!p.has_more) return (p.relation ?? []).map((r: any) => r.id);
  const out: string[] = [];
  let cursor: string | undefined;
  do {
    const res: any = await client.pages.properties.retrieve({ page_id: page.id, property_id: p.id, start_cursor: cursor });
    for (const r of res.results ?? []) out.push(r.relation.id);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return out;
}

/** Notion を読み直して「手つかず」かを確かめる */
export async function isUntouchedPage(client: Client, page: Page): Promise<boolean> {
  const st = page.properties["ステータス"];
  const status = st?.status?.name ?? st?.select?.name ?? "";
  if (!UNTOUCHED_STATUSES.has(status)) return false;
  if ((page.properties["コール数"]?.number ?? 0) > 0) return false;
  if (plain(page.properties["メモ"]).trim()) return false;
  if (page.properties["アポイント取得日"]?.date) return false;
  for (const r of ACTIVITY_RELATIONS) if ((await relationIds(client, page, r)).length > 0) return false;
  return true;
}

export type MergeResult = { keepId: string; removed: string[]; copied: string[]; skipped?: string };

/**
 * keep に removes をまとめる。mode "auto" は removes が全て手つかずのときだけ実行。
 * "manual" は紐付け（架電記録など）を残す側に付け替え、メモを追記してから消す側をゴミ箱へ
 */
export async function mergeCustomers(client: Client, keepId: string, removeIds: string[], mode: "auto" | "manual", actor: string): Promise<MergeResult> {
  const keep = (await client.pages.retrieve({ page_id: keepId })) as unknown as Page;
  if (keep.in_trash || keep.archived) return { keepId, removed: [], copied: [], skipped: "残す側のページがゴミ箱にあります" };
  const removes: Page[] = [];
  for (const id of removeIds) {
    const p = (await client.pages.retrieve({ page_id: id })) as unknown as Page;
    if (p.in_trash || p.archived) continue;
    if (mode === "auto" && !(await isUntouchedPage(client, p))) return { keepId, removed: [], copied: [], skipped: "消す側に履歴が入っていたため触っていません" };
    removes.push(p);
  }
  if (removes.length === 0) return { keepId, removed: [], copied: [], skipped: "消す側のページが見つかりません" };

  const update: Record<string, unknown> = {};
  const copied: string[] = [];
  for (const [name, kp] of Object.entries(keep.properties)) {
    if (NO_COPY.has(name) || kp.type === "title") continue;
    if (kp.type === "multi_select") {
      const names = new Set<string>((kp.multi_select ?? []).map((o: any) => o.name));
      const before = names.size;
      for (const r of removes) for (const o of r.properties[name]?.multi_select ?? []) names.add(o.name);
      if (names.size > before) {
        update[name] = { multi_select: [...names].map((n) => ({ name: n })) };
        copied.push(name);
      }
      continue;
    }
    if (kp.type === "relation") {
      if (mode !== "manual") continue;
      const ids = new Set(await relationIds(client, keep, name));
      const before = ids.size;
      for (const r of removes) for (const id of await relationIds(client, r, name)) ids.add(id);
      if (ids.size > before) {
        if (ids.size > 100) return { keepId, removed: [], copied: [], skipped: `「${name}」の紐付けが100件を超えるため、Notion で手作業でまとめてください` };
        update[name] = { relation: [...ids].map((id) => ({ id })) };
        copied.push(name);
      }
      continue;
    }
    if (!isEmpty(kp)) continue;
    const src = removes.map((r) => r.properties[name]).find((p) => p && p.type === kp.type && !isEmpty(p));
    const w = src && writable(src);
    if (w) {
      update[name] = w;
      copied.push(name);
    }
  }
  if (mode === "manual") {
    // 残す側のステータスが空なら、消す側のものを使う
    const ks = keep.properties["ステータス"];
    if (ks?.type === "status" && !ks.status) {
      const rs = removes.map((r) => r.properties["ステータス"]?.status?.name).find(Boolean);
      if (rs) update["ステータス"] = { status: { name: rs } };
    }
    const memos = removes
      .map((r) => ({ name: plain(r.properties["顧客名"]), memo: plain(r.properties["メモ"]).trim() }))
      .filter((m) => m.memo);
    if (memos.length) {
      const base = plain(keep.properties["メモ"]);
      const add = memos.map((m) => `【統合 ${new Date().toISOString().slice(0, 10)} ${actor}】${m.name}: ${m.memo}`).join("\n");
      const text = `${base}${base ? "\n" : ""}${add}`.slice(0, 2000 * 100);
      const parts: any[] = [];
      for (let i = 0; i < text.length; i += 2000) parts.push({ type: "text", text: { content: text.slice(i, i + 2000) } });
      update["メモ"] = { rich_text: parts };
    }
  }
  if (Object.keys(update).length) await client.pages.update({ page_id: keepId, properties: update as any });
  for (const r of removes) await client.pages.update({ page_id: r.id, archived: true });
  return { keepId, removed: removes.map((r) => r.id), copied };
}
