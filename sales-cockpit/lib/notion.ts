import { Client } from "@notionhq/client";
import type { Customer, Contract, CallEvent, CallTarget } from "./types";

// ── Notion クライアント & 設定 ───────────────────────────────────
export const NOTION_REVALIDATE = Number(process.env.NOTION_REVALIDATE_SECONDS ?? 300);

const TOKEN = process.env.NOTION_TOKEN ?? "";

export const DB = {
  customers: process.env.NOTION_DB_CUSTOMERS ?? "",
  calls: process.env.NOTION_DB_CALLS ?? "",
  contracts: process.env.NOTION_DB_CONTRACTS ?? "",
  isKpi: process.env.NOTION_DB_ISKPI ?? "",
};

export function notionConfigured(): boolean {
  return Boolean(TOKEN && DB.customers);
}

let _client: Client | null = null;
function client(): Client {
  if (!_client) _client = new Client({ auth: TOKEN });
  return _client;
}

/** データベース全ページをページネーションして取得 */
async function queryAll(databaseId: string): Promise<any[]> {
  if (!databaseId) return [];
  const out: any[] = [];
  let cursor: string | undefined;
  // 無限ループ防止に上限を設ける（最大 50ページ = 5000件）
  for (let i = 0; i < 50; i++) {
    const res: any = await client().databases.query({
      database_id: databaseId,
      start_cursor: cursor,
      page_size: 100,
    });
    out.push(...res.results);
    if (!res.has_more) break;
    cursor = res.next_cursor ?? undefined;
  }
  return out;
}

// ── プロパティ抽出ヘルパー ───────────────────────────────────────
const P = (page: any, name: string) => page?.properties?.[name];

function txt(page: any, name: string): string | null {
  const p = P(page, name);
  if (!p) return null;
  if (p.type === "title") return p.title?.map((t: any) => t.plain_text).join("") || null;
  if (p.type === "rich_text") return p.rich_text?.map((t: any) => t.plain_text).join("") || null;
  return null;
}
function sel(page: any, name: string): string | null {
  const p = P(page, name);
  if (!p) return null;
  if (p.type === "select") return p.select?.name ?? null;
  if (p.type === "status") return p.status?.name ?? null;
  return null;
}
function multi(page: any, name: string): string[] {
  const p = P(page, name);
  return p?.type === "multi_select" ? p.multi_select.map((o: any) => o.name) : [];
}
function number(page: any, name: string): number | null {
  const p = P(page, name);
  if (p?.type === "number") return p.number;
  if (p?.type === "rollup" && p.rollup?.type === "number") return p.rollup.number ?? null;
  return null;
}
function phone(page: any, name: string): string | null {
  const p = P(page, name);
  return p?.type === "phone_number" ? p.phone_number : null;
}
function dateStart(page: any, name: string): string | null {
  const p = P(page, name);
  if (p?.type === "date") return p.date?.start ?? null;
  if (p?.type === "created_time") return p.created_time ?? null;
  if (p?.type === "rollup" && p.rollup?.type === "date") return p.rollup.date?.start ?? null;
  return null;
}
function person(page: any, name: string): string | null {
  const p = P(page, name);
  if (p?.type === "people") return p.people?.[0]?.name ?? null;
  return null;
}

// ── 各DBの取得（正規化して返す） ─────────────────────────────────
export async function fetchCustomers(): Promise<Customer[]> {
  const pages = await queryAll(DB.customers);
  return pages.map((pg) => ({
    id: pg.id,
    url: pg.url,
    name: txt(pg, "顧客名") ?? "(無名)",
    phone: phone(pg, "電話番号"),
    status: sel(pg, "ステータス"),
    rank: sel(pg, "見込み度合い"),
    industry: sel(pg, "業種"),
    isRep: sel(pg, "IS担当"),
    sRep: sel(pg, "S担当"),
    method: sel(pg, "営業手法"),
    callCount: number(pg, "架電回数"),
    lastCallDate: dateStart(pg, "最終架電日"),
    appointmentDate: dateStart(pg, "アポイント取得日"),
  }));
}

const APPT_RESULTS = new Set(["アポイント獲得", "アポ獲得"]);
const CONNECTED_RESULTS = new Set(["通話", "接続", "見込み客", "資料請求", "アポイント獲得", "アポ獲得"]);

export async function fetchCalls(): Promise<CallEvent[]> {
  const pages = await queryAll(DB.calls);
  return pages.map((pg) => {
    const result = sel(pg, "結果");
    return {
      id: pg.id,
      date: dateStart(pg, "架電日時") ?? pg.created_time ?? null,
      rep: sel(pg, "担当者"),
      result,
      isAppointment: !!result && APPT_RESULTS.has(result),
      isConnected: !!result && CONNECTED_RESULTS.has(result),
      source: "架電記録" as const,
    };
  });
}

/** IS架電KPI（架電ログ）。マルチソースDBのため失敗時は空配列で穏当に縮退。 */
export async function fetchIsKpiCalls(): Promise<CallEvent[]> {
  if (!DB.isKpi) return [];
  const pages = await queryAll(DB.isKpi);
  return pages.map((pg) => {
    const status = sel(pg, "ステータス");
    return {
      id: pg.id,
      date: dateStart(pg, "架電日") ?? pg.created_time ?? null,
      rep: sel(pg, "IS担当（顧客DB準拠）") ?? person(pg, "IS担当"),
      result: status,
      isAppointment: !!status && APPT_RESULTS.has(status),
      isConnected: !!status && CONNECTED_RESULTS.has(status),
      source: "IS架電KPI" as const,
    };
  });
}

/** IS架電KPI 内の「🎯目標設定」。マルチソースのため取得不可なら空。 */
export async function fetchTargets(): Promise<CallTarget[]> {
  // 目標設定は IS架電KPI と同一データベース内の別データソース。
  // 公開REST API では別ソースを直接引けない場合があるため、失敗は呼び出し側で握り潰す。
  return [];
}

export async function fetchContracts(): Promise<Contract[]> {
  const pages = await queryAll(DB.contracts);
  return pages.map((pg) => ({
    id: pg.id,
    name: txt(pg, "契約名") ?? "(無名契約)",
    status: sel(pg, "ステータス"),
    monthly: number(pg, "月額料金") ?? 0,
    start: dateStart(pg, "契約開始日"),
    end: dateStart(pg, "契約終了日"),
    kinds: multi(pg, "契約種別"),
    churnRisk: sel(pg, "解約リスク"),
    nextRenewal: dateStart(pg, "次回更新日"),
  }));
}
