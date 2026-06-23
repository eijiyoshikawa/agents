import { Client } from "@notionhq/client";
import type { Customer, Contract, CallEvent } from "./types";

// ── Notion クライアント & 設定 ───────────────────────────────────
export const NOTION_REVALIDATE = Number(process.env.NOTION_REVALIDATE_SECONDS ?? 300);

const TOKEN = process.env.NOTION_TOKEN ?? "";

// 既定の DB ID（株式会社LET公式Notionの実DB）。環境変数があればそちらを優先。
const DEFAULTS = {
  customers: "1ac3fae4-3499-4991-b465-e375bef7d66c", // 📊 DB_顧客管理
  calls: "f2a72c62-21ed-4de5-acb0-00848c9b0cbe", // 📞 架電記録
  contracts: "b079ca72-2a13-4562-96d6-cd83b4787bbd", // 🤝 契約管理DB
  isKpi: "f9fa0d32-3eb1-4625-9f4a-e06cc0cedb6b", // 📞 IS架電KPI（架電ログ）
};

export const DB = {
  customers: process.env.NOTION_DB_CUSTOMERS || DEFAULTS.customers,
  calls: process.env.NOTION_DB_CALLS || DEFAULTS.calls,
  contracts: process.env.NOTION_DB_CONTRACTS || DEFAULTS.contracts,
  isKpi: process.env.NOTION_DB_ISKPI || DEFAULTS.isKpi,
  // アプリ管理用（MCPで自動生成）
  users: process.env.NOTION_DB_USERS || "791601fb-82eb-4130-aa0f-727bde6b9444",
  targets: process.env.NOTION_DB_TARGETS || "2b8a2f71-e915-434a-ae5b-a3d2eb84aa47",
  lists: process.env.NOTION_DB_LISTS || "2a4d040c-8485-41e4-8403-994df6702757",
};

// Notion プロパティ組み立てヘルパー（書き込み用）
const rt = (s: string) => ({ rich_text: [{ type: "text" as const, text: { content: s ?? "" } }] });
const tt = (s: string) => ({ title: [{ type: "text" as const, text: { content: s ?? "" } }] });

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
  // 取得上限ページ数（1ページ=100件）。既定120ページ=12,000件。env で変更可。
  const maxPages = Number(process.env.NOTION_MAX_PAGES ?? 120);
  for (let i = 0; i < maxPages; i++) {
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
  if (p?.type === "formula" && p.formula?.type === "number") return p.formula.number ?? null;
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
function formulaStr(page: any, name: string): string | null {
  const p = P(page, name);
  if (p?.type === "formula" && p.formula?.type === "string") return p.formula.string ?? null;
  return null;
}
function email(page: any, name: string): string | null {
  const p = P(page, name);
  return p?.type === "email" ? p.email : null;
}
function url(page: any, name: string): string | null {
  const p = P(page, name);
  return p?.type === "url" ? p.url : null;
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
    phase: sel(pg, "企業フェーズ"),
    pref: formulaStr(pg, "都道府県"),
    isRep: sel(pg, "IS担当"),
    sRep: sel(pg, "S担当"),
    csRep: sel(pg, "CS担当"),
    method: sel(pg, "営業手法"),
    callCount: number(pg, "架電回数"),
    lastCallDate: dateStart(pg, "最終架電日"),
    appointmentDate: dateStart(pg, "アポイント取得日"),
    address: txt(pg, "住所"),
    email: email(pg, "メールアドレス"),
    companyUrl: url(pg, "会社URL"),
    rep3: txt(pg, "代表者名"),
    memo: txt(pg, "メモ"),
    sns: multi(pg, "SNS"),
    founded: number(pg, "設立年"),
    employees: number(pg, "従業員数"),
    listing: sel(pg, "上場区分"),
    recruitPage: url(pg, "採用ページ"),
    media: multi(pg, "掲載元メディア"),
  }));
}

/** 顧客ページの「メモ」を更新（Notion書き込み）。インテグレーションに更新権限が必要。 */
export async function updateCustomerMemo(pageId: string, memo: string): Promise<void> {
  await client().pages.update({
    page_id: pageId,
    properties: { メモ: { rich_text: [{ type: "text", text: { content: memo } }] } },
  });
}

// ── アプリユーザー（ログイン） ───────────────────────────────────
export type AppUser = { pageId: string; name: string; userId: string; passwordHash: string };

export async function findUserByLoginId(userId: string): Promise<AppUser | null> {
  const pages = await queryAll(DB.users);
  const norm = userId.trim().toLowerCase();
  for (const pg of pages) {
    const uid = (txt(pg, "ユーザーID") ?? "").trim().toLowerCase();
    if (uid && uid === norm) {
      return {
        pageId: pg.id,
        name: txt(pg, "名前") ?? userId,
        userId: txt(pg, "ユーザーID") ?? userId,
        passwordHash: txt(pg, "パスワードハッシュ") ?? "",
      };
    }
  }
  return null;
}

export async function createUser(input: {
  name: string;
  userId: string;
  passwordHash: string;
  creator?: string;
}): Promise<void> {
  await client().pages.create({
    parent: { database_id: DB.users },
    properties: {
      名前: tt(input.name),
      ユーザーID: rt(input.userId),
      パスワードハッシュ: rt(input.passwordHash),
      作成者: rt(input.creator ?? ""),
    },
  });
}

export async function touchUserLogin(pageId: string): Promise<void> {
  try {
    await client().pages.update({
      page_id: pageId,
      properties: { 最終ログイン: { date: { start: new Date().toISOString() } } },
    });
  } catch {
    /* 失敗しても致命的ではない */
  }
}

// ── 目標設定（サイト内編集） ─────────────────────────────────────
export type StoredTargets = {
  workingDaysPerMonth: number;
  monthlyAppointments: number;
  monthlyContracts: number;
  dailyCallsDefault: number;
  dailyCallsByRep: Record<string, number>;
  updatedBy?: string;
};

const TARGET_KEY = "default"; // 全社の既定行を1つだけ使う

/** 保存済み目標（default行）を取得。無ければ null。 */
export async function getStoredTargets(): Promise<StoredTargets | null> {
  const pages = await queryAll(DB.targets);
  const row = pages.find((pg) => (txt(pg, "対象月") ?? "") === TARGET_KEY) ?? pages[0];
  if (!row) return null;
  let byRep: Record<string, number> = {};
  try {
    byRep = JSON.parse(txt(row, "担当別日次目標JSON") ?? "{}");
  } catch {
    byRep = {};
  }
  return {
    workingDaysPerMonth: number(row, "営業日数") ?? 20,
    monthlyAppointments: number(row, "月次アポ目標") ?? 0,
    monthlyContracts: number(row, "月次契約目標") ?? 0,
    dailyCallsDefault: number(row, "日次架電目標") ?? 0,
    dailyCallsByRep: byRep,
  };
}

// ── 保存架電リスト ───────────────────────────────────────────────
export type ListFilters = { q?: string; rep?: string; status?: string; rank?: string; industry?: string };
export type SavedList = {
  pageId: string;
  name: string;
  creator: string;
  createdTime: string;
  count: number;
  filters: ListFilters;
};

export async function listSavedLists(): Promise<SavedList[]> {
  const pages = await queryAll(DB.lists);
  const out: SavedList[] = pages.map((pg) => {
    let filters: ListFilters = {};
    try {
      filters = JSON.parse(txt(pg, "抽出条件") ?? "{}");
    } catch {
      filters = {};
    }
    return {
      pageId: pg.id,
      name: txt(pg, "リスト名") ?? "(無名)",
      creator: txt(pg, "作成者") ?? "",
      createdTime: pg.created_time ?? "",
      count: number(pg, "件数") ?? 0,
      filters,
    };
  });
  return out.sort((a, b) => (b.createdTime ?? "").localeCompare(a.createdTime ?? ""));
}

export async function createSavedList(input: {
  name: string;
  creator: string;
  filters: ListFilters;
  count: number;
}): Promise<void> {
  await client().pages.create({
    parent: { database_id: DB.lists },
    properties: {
      リスト名: tt(input.name),
      作成者: rt(input.creator),
      抽出条件: rt(JSON.stringify(input.filters ?? {})),
      件数: { number: input.count || 0 },
    },
  });
}

export async function deleteSavedList(pageId: string): Promise<void> {
  await client().pages.update({ page_id: pageId, archived: true });
}

/** 目標（default行）を作成 or 更新。 */
export async function saveStoredTargets(t: StoredTargets): Promise<void> {
  const props: any = {
    名称: tt("全社目標"),
    対象月: rt(TARGET_KEY),
    月次アポ目標: { number: t.monthlyAppointments || 0 },
    月次契約目標: { number: t.monthlyContracts || 0 },
    日次架電目標: { number: t.dailyCallsDefault || 0 },
    営業日数: { number: t.workingDaysPerMonth || 20 },
    担当別日次目標JSON: rt(JSON.stringify(t.dailyCallsByRep ?? {})),
    更新者: rt(t.updatedBy ?? ""),
  };
  const pages = await queryAll(DB.targets);
  const existing = pages.find((pg) => (txt(pg, "対象月") ?? "") === TARGET_KEY) ?? pages[0];
  if (existing) {
    await client().pages.update({ page_id: existing.id, properties: props });
  } else {
    await client().pages.create({ parent: { database_id: DB.targets }, properties: props });
  }
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
      monthlyTarget: null,
    };
  });
}

/** IS架電KPI（架電ログ）。各行に「月次目標架電数」を持つため目標値もここで拾う。 */
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
      monthlyTarget: number(pg, "月次目標架電数"),
    };
  });
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
