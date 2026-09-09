import { Client } from "@notionhq/client";
import type { Customer, Contract, CallEvent, ListCustomer } from "./types";
import { isExcludedRep } from "./reps";

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
  callTargets: process.env.NOTION_DB_CALL_TARGETS || "0b19647d-b3d8-4b00-b90d-45dc1754be21",
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

/**
 * データベース全ページをページネーションして取得（任意でNotionフィルタ指定）。
 * filterProperties を渡すと、そのプロパティIDのみ返却されるため転送量・処理が大幅に軽くなる。
 */
// 取得上限ページ数（1ページ=100件）。既定400ページ=40,000件（全件カバー）。env で変更可。
export const NOTION_MAX_PAGES = Number(process.env.NOTION_MAX_PAGES ?? 400);

async function queryAll(databaseId: string, filter?: any, filterProperties?: string[]): Promise<any[]> {
  if (!databaseId) return [];
  const out: any[] = [];
  let cursor: string | undefined;
  for (let i = 0; i < NOTION_MAX_PAGES; i++) {
    const res: any = await client().databases.query({
      database_id: databaseId,
      start_cursor: cursor,
      page_size: 100,
      ...(filter ? { filter } : {}),
      ...(filterProperties && filterProperties.length ? { filter_properties: filterProperties } : {}),
    });
    out.push(...res.results);
    if (!res.has_more) break;
    cursor = res.next_cursor ?? undefined;
  }
  return out;
}

// 実績集計の起点日（この日以降に更新されたもののみ実績へ反映）。env で変更可。
export const METRICS_SINCE = process.env.METRICS_SINCE || "2026-05-07";

// 「着手済み」= ステータスあり かつ アプローチ前以外、かつ METRICS_SINCE 以降に更新。
// ダッシュボードの実績を「指定日以降」に限定しつつ、正確・高速に集計するため。
const WORKED_FILTER = {
  and: [
    { property: "ステータス", status: { is_not_empty: true } },
    { property: "ステータス", status: { does_not_equal: "アプローチ前" } },
    { timestamp: "last_edited_time", last_edited_time: { on_or_after: METRICS_SINCE } },
  ],
};

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
function relationIds(page: any, name: string): string[] {
  const p = P(page, name);
  return p?.type === "relation" ? p.relation.map((r: any) => r.id) : [];
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
function mapCustomer(pg: any): Customer {
  return {
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
    lastEdited: pg.last_edited_time ?? null,
    nextFollow: dateStart(pg, "次回フォロー日"),
    confirm: sel(pg, "確認状況"),
  };
}

/** フォロー対象（再コール or 次回フォロー日あり）を取得 */
export async function fetchFollowups(): Promise<Customer[]> {
  const pages = await queryAll(DB.customers, {
    or: [
      { property: "ステータス", status: { equals: "再コール" } },
      { property: "次回フォロー日", date: { is_not_empty: true } },
    ],
  });
  return pages.map(mapCustomer);
}

/** 確認状況を更新（重複マーク用） */
export async function updateCustomerConfirm(pageId: string, value: string): Promise<void> {
  await client().pages.update({ page_id: pageId, properties: { 確認状況: { select: { name: value } } } });
}

// ── 顧客項目の編集（Notionへ反映） ───────────────────────────────
const CUSTOMER_EDIT_TYPES: Record<string, "status" | "select" | "text" | "phone" | "email" | "url" | "date"> = {
  ステータス: "status",
  見込み度合い: "select",
  業種: "select",
  企業フェーズ: "select",
  営業手法: "select",
  IS担当: "select",
  S担当: "select",
  CS担当: "select",
  上場区分: "select",
  電話番号: "phone",
  代表者名: "text",
  住所: "text",
  メールアドレス: "email",
  会社URL: "url",
  採用ページ: "url",
  アポイント取得日: "date",
  次回フォロー日: "date",
};

/** 編集可能な選択肢系フィールドの選択肢をNotionスキーマから取得 */
export async function fetchCustomerFieldOptions(): Promise<Record<string, string[]>> {
  const out: Record<string, string[]> = {};
  try {
    const db: any = await client().databases.retrieve({ database_id: DB.customers });
    for (const [name, type] of Object.entries(CUSTOMER_EDIT_TYPES)) {
      if (type !== "select" && type !== "status") continue;
      const p = db.properties?.[name];
      const opts = p?.status?.options ?? p?.select?.options ?? [];
      out[name] = opts.map((o: any) => o.name).filter(Boolean);
    }
  } catch {
    /* スキーマ取得失敗時は空 */
  }
  return out;
}

/** 顧客の各項目を更新（型に応じてNotionへ書き込み。空文字はクリア） */
export async function updateCustomer(pageId: string, fields: Record<string, string>): Promise<void> {
  const props: any = {};
  for (const [name, raw] of Object.entries(fields)) {
    const t = CUSTOMER_EDIT_TYPES[name];
    if (!t) continue;
    const v = (raw ?? "").toString().trim();
    if (t === "status") props[name] = { status: v ? { name: v } : null };
    else if (t === "select") props[name] = { select: v ? { name: v } : null };
    else if (t === "text") props[name] = { rich_text: v ? [{ type: "text", text: { content: v } }] : [] };
    else if (t === "phone") props[name] = { phone_number: v || null };
    else if (t === "email") props[name] = { email: v || null };
    else if (t === "url") props[name] = { url: v || null };
    else if (t === "date") props[name] = { date: v ? { start: v } : null };
  }
  if (Object.keys(props).length > 0) {
    await client().pages.update({ page_id: pageId, properties: props });
  }
}

/** 全顧客（取得上限まで）。架電リスト用。 */
export async function fetchCustomers(): Promise<Customer[]> {
  const pages = await queryAll(DB.customers);
  return pages.map(mapCustomer);
}

// ── 軽量リスト取得（必要プロパティのみ・全件高速化） ───────────────
/** 一覧/分析で使う最小限のプロパティ名（filter_properties 用にIDへ変換する） */
const LIST_FIELD_NAMES = [
  "顧客名", "電話番号", "ステータス", "見込み度合い", "業種", "企業フェーズ",
  "営業手法", "IS担当", "S担当", "都道府県", "架電回数", "最終架電日",
  "アポイント取得日", "住所", "確認状況", "従業員数", "掲載元メディア",
];

let _listPropIds: string[] | null = null;
/** リスト用プロパティのNotion内部IDを取得（filter_properties用・1プロセス内キャッシュ） */
export async function fetchListPropertyIds(): Promise<string[]> {
  if (_listPropIds) return _listPropIds;
  try {
    const db: any = await client().databases.retrieve({ database_id: DB.customers });
    const ids: string[] = [];
    for (const name of LIST_FIELD_NAMES) {
      const p = db.properties?.[name];
      if (p?.id) ids.push(p.id);
    }
    _listPropIds = ids;
    return ids;
  } catch {
    return [];
  }
}

function mapListCustomer(pg: any): ListCustomer {
  return {
    id: pg.id,
    url: pg.url,
    name: txt(pg, "顧客名") ?? "(無名)",
    phone: phone(pg, "電話番号"),
    status: sel(pg, "ステータス"),
    rank: sel(pg, "見込み度合い"),
    industry: sel(pg, "業種"),
    phase: sel(pg, "企業フェーズ"),
    method: sel(pg, "営業手法"),
    pref: formulaStr(pg, "都道府県"),
    isRep: sel(pg, "IS担当"),
    sRep: sel(pg, "S担当"),
    callCount: number(pg, "架電回数"),
    lastCallDate: dateStart(pg, "最終架電日"),
    appointmentDate: dateStart(pg, "アポイント取得日"),
    lastEdited: pg.last_edited_time ?? null,
    address: txt(pg, "住所"),
    confirm: sel(pg, "確認状況"),
    employees: number(pg, "従業員数"),
    media: multi(pg, "掲載元メディア"),
  };
}

/** 全顧客（軽量版・必要項目のみ）。一覧/分析/重複/品質用。詳細はIDで都度取得。 */
export async function fetchCustomersSlim(editedSince?: string): Promise<ListCustomer[]> {
  const ids = await fetchListPropertyIds();
  // editedSince 指定時は「その時刻以降に更新されたページのみ」取得（増分同期用）。
  // 全2万件超の取り直しを避け、Notion API 呼び出しを数回に抑える。
  const filter = editedSince
    ? { timestamp: "last_edited_time", last_edited_time: { on_or_after: editedSince } }
    : undefined;
  const pages = await queryAll(DB.customers, filter, ids.length ? ids : undefined);
  return pages.map(mapListCustomer);
}

/** 最近更新された顧客のみ（軽量）。今日/週次/サマリの活動集計用。since=YYYY-MM-DD（UTC基準で多めに取得しJST側で絞る） */
export async function fetchRecentlyEditedSlim(since: string): Promise<ListCustomer[]> {
  const ids = await fetchListPropertyIds();
  const pages = await queryAll(
    DB.customers,
    { timestamp: "last_edited_time", last_edited_time: { on_or_after: since } },
    ids.length ? ids : undefined,
  );
  return pages.map(mapListCustomer);
}

/**
 * アポイント取得日のバックフィル。
 * Notionで直接ステータスを「アポイント獲得」にした顧客は「アポイント取得日」が
 * 空のままで、日次/週次のアポ集計に乗らない。ここで取得日が空のアポ獲得顧客を探し、
 * ページの最終更新時刻(JST)＝ほぼステータス変更日 を取得日として書き込む。
 * sync cron(30分毎)と日次/週次レポート送信直前に実行するため、日付のズレは最小。
 * @returns 埋めた顧客の { id, date } 一覧（呼び出し側でメモリ上のデータにも反映できる）
 */
export async function backfillAppointmentDates(): Promise<{ id: string; date: string }[]> {
  const pages = await queryAll(DB.customers, {
    and: [
      { property: "ステータス", status: { equals: "アポイント獲得" } },
      { property: "アポイント取得日", date: { is_empty: true } },
    ],
  });
  const filled: { id: string; date: string }[] = [];
  // 手入力の取りこぼし補完が目的なので一度に大量更新はしない（安全のため上限50件/回）
  for (const pg of pages.slice(0, 50)) {
    const edited = pg.last_edited_time ?? new Date().toISOString();
    // JSTの日付（UTC+9時間してから日付部分を取る）
    const date = new Date(new Date(edited).getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);
    try {
      await client().pages.update({
        page_id: pg.id,
        properties: { アポイント取得日: { date: { start: date } } },
      });
      filled.push({ id: pg.id, date });
    } catch (e) {
      console.error("アポ取得日バックフィル失敗:", pg.id, (e as Error)?.message);
    }
  }
  return filled;
}

/** アポイント取得日が入っている顧客のみ（軽量）。アポ月次/週次サマリ用。 */
export async function fetchAppointedSlim(): Promise<ListCustomer[]> {
  const ids = await fetchListPropertyIds();
  const pages = await queryAll(
    DB.customers,
    { property: "アポイント取得日", date: { is_not_empty: true } },
    ids.length ? ids : undefined,
  );
  return pages.map(mapListCustomer);
}

export const PIPELINE_STATUSES = ["アポイント獲得", "提案中", "商談中", "契約中", "パートナー"];
/** 商談中ステータスの顧客のみ（軽量）。パイプライン用。 */
export async function fetchPipelineSlim(): Promise<ListCustomer[]> {
  const ids = await fetchListPropertyIds();
  const pages = await queryAll(
    DB.customers,
    { or: PIPELINE_STATUSES.map((s) => ({ property: "ステータス", status: { equals: s } })) },
    ids.length ? ids : undefined,
  );
  return pages.map(mapListCustomer);
}

/** 着手済み顧客（ステータスあり・アプローチ前以外）。ダッシュボード集計用（正確・高速）。 */
export async function fetchWorkedCustomers(): Promise<Customer[]> {
  const pages = await queryAll(DB.customers, WORKED_FILTER);
  return pages.map(mapCustomer);
}

/** 顧客ページの「メモ」を更新（Notion書き込み）。インテグレーションに更新権限が必要。 */
export async function updateCustomerMemo(pageId: string, memo: string): Promise<void> {
  await client().pages.update({
    page_id: pageId,
    properties: { メモ: { rich_text: [{ type: "text", text: { content: memo } }] } },
  });
}

// ── 架電結果の記録（日付ログ＋ステータス更新） ───────────────────
const CALL_RESULT_OPTIONS = new Set([
  "通話", "不在", "不通", "受付拒否", "担当者不在", "担当者拒否", "再コール", "クレーム", "見込み客", "資料請求", "アポイント獲得",
]);
const CUSTOMER_STATUS_OPTIONS = new Set([
  "アプローチ前", "受付拒否", "不通", "担当者不在", "担当者拒否", "再コール", "クレーム", "見込み客", "資料請求",
  "アポイント獲得", "提案中", "商談中", "契約中", "契約終了", "失注", "パートナー",
]);
const CALL_REP_OPTIONS = new Set(["江原", "佐久間in", "海野in", "三輪in", "境田in", "吉田", "吉川", "長野", "ロビンソンin"]);

/**
 * 架電結果を記録: ①📞架電記録に日付つきで1行作成 ②該当すれば顧客ステータスを更新。
 * status はフォームで選んだ「結果/ステータス」。アポ獲得時はアポ取得日も更新。
 */
export async function recordCall(input: {
  customerId: string;
  customerName: string;
  result: string; // 結果＝顧客ステータスの選択肢
  memo?: string;
  repName?: string;
  setAppointmentDate?: boolean;
}): Promise<void> {
  const now = new Date().toISOString();
  // ① 架電記録（日付ログ）。結果が架電記録の選択肢にあれば設定、無ければ「通話」。
  const logProps: any = {
    件名: tt(input.customerName || "架電"),
    結果: { select: { name: CALL_RESULT_OPTIONS.has(input.result) ? input.result : "通話" } },
    メモ: rt(input.memo ?? ""),
    顧客: { relation: [{ id: input.customerId }] },
    架電日時: { date: { start: now } },
  };
  if (input.repName && CALL_REP_OPTIONS.has(input.repName)) {
    logProps["担当者"] = { select: { name: input.repName } };
  }
  await client().pages.create({ parent: { database_id: DB.calls }, properties: logProps });

  // ② 顧客ステータス更新（結果が顧客ステータスの選択肢のときのみ）
  const custProps: any = {};
  if (CUSTOMER_STATUS_OPTIONS.has(input.result)) {
    custProps["ステータス"] = { status: { name: input.result } };
  }
  if (input.setAppointmentDate || input.result === "アポイント獲得") {
    custProps["アポイント取得日"] = { date: { start: now.slice(0, 10) } };
  }
  if (Object.keys(custProps).length > 0) {
    await client().pages.update({ page_id: input.customerId, properties: custProps });
  }
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
  monthlyContracts: number; // 後方互換（総数）
  monthlyContractsSns: number; // 採用SNS
  monthlyContractsAgency: number; // 人材紹介
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
    monthlyContractsSns: number(row, "月次契約目標_採用SNS") ?? 0,
    monthlyContractsAgency: number(row, "月次契約目標_人材紹介") ?? 0,
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

// ── 担当者一覧（Notion依存） ─────────────────────────────────────
/** DB_顧客管理の「IS担当」選択肢を担当者マスタとして取得 */
export async function fetchRepOptions(): Promise<string[]> {
  try {
    const db: any = await client().databases.retrieve({ database_id: DB.customers });
    const prop = db.properties?.["IS担当"];
    const opts = prop?.select?.options ?? prop?.multi_select?.options ?? [];
    return opts.map((o: any) => o.name).filter(Boolean).filter((n: string) => !isExcludedRep(n));
  } catch {
    return [];
  }
}

// ── 架電目標（日次・週次／担当別） ───────────────────────────────
export type CallTargetData = Record<string, Record<string, number>>; // 担当 -> { 日付キー: 件数 }

export async function getCallTargets(type: "日次" | "週次", month: string): Promise<CallTargetData> {
  const pages = await queryAll(DB.callTargets, {
    and: [
      { property: "種別", select: { equals: type } },
      { property: "対象月", rich_text: { equals: month } },
    ],
  });
  const out: CallTargetData = {};
  for (const pg of pages) {
    const rep = txt(pg, "担当") ?? "";
    if (!rep) continue;
    let detail: Record<string, number> = {};
    try {
      detail = JSON.parse(txt(pg, "明細JSON") ?? "{}");
    } catch {
      detail = {};
    }
    out[rep] = detail;
  }
  return out;
}

export async function saveCallTargets(input: {
  type: "日次" | "週次";
  month: string;
  byRep: CallTargetData;
  updatedBy?: string;
}): Promise<void> {
  const existing = await queryAll(DB.callTargets, {
    and: [
      { property: "種別", select: { equals: input.type } },
      { property: "対象月", rich_text: { equals: input.month } },
    ],
  });
  const pageByRep = new Map<string, string>();
  for (const pg of existing) {
    const r = txt(pg, "担当");
    if (r) pageByRep.set(r, pg.id);
  }
  for (const [rep, detail] of Object.entries(input.byRep)) {
    const props: any = {
      名称: tt(`${rep}｜${input.type}｜${input.month}`),
      担当: rt(rep),
      種別: { select: { name: input.type } },
      対象月: rt(input.month),
      明細JSON: rt(JSON.stringify(detail ?? {})),
      更新者: rt(input.updatedBy ?? ""),
    };
    const pid = pageByRep.get(rep);
    if (pid) await client().pages.update({ page_id: pid, properties: props });
    else await client().pages.create({ parent: { database_id: DB.callTargets }, properties: props });
  }
}

/** 目標（default行）を作成 or 更新。 */
export async function saveStoredTargets(t: StoredTargets): Promise<void> {
  const props: any = {
    名称: tt("全社目標"),
    対象月: rt(TARGET_KEY),
    月次アポ目標: { number: t.monthlyAppointments || 0 },
    月次契約目標: { number: t.monthlyContracts || 0 },
    "月次契約目標_採用SNS": { number: t.monthlyContractsSns || 0 },
    "月次契約目標_人材紹介": { number: t.monthlyContractsAgency || 0 },
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
    sRep: sel(pg, "S担当"),
    csRep: sel(pg, "社内担当"),
    health: sel(pg, "健全性スコア"),
    customerId: relationIds(pg, "顧客")[0] ?? null,
  }));
}

/** 顧客を1件取得（単体詳細ページ用・高速） */
export async function fetchCustomerById(id: string): Promise<Customer | null> {
  try {
    const pg: any = await client().pages.retrieve({ page_id: id });
    return mapCustomer(pg);
  } catch {
    return null;
  }
}

/** 複数IDの顧客をまとめて取得（契約→顧客の紐付け用） */
export async function fetchCustomersByIds(ids: string[]): Promise<Map<string, Customer>> {
  const uniq = [...new Set(ids.filter(Boolean))];
  const out = new Map<string, Customer>();
  await Promise.all(
    uniq.map(async (id) => {
      const c = await fetchCustomerById(id);
      if (c) out.set(id, c);
    }),
  );
  return out;
}

/** 顧客名（部分一致）で1件検索（契約名→顧客リンクの補完用） */
export async function fetchCustomerByName(name: string): Promise<Customer | null> {
  const q = name.trim();
  if (!q) return null;
  try {
    const res: any = await client().databases.query({
      database_id: DB.customers,
      filter: { property: "顧客名", title: { contains: q } },
      page_size: 1,
    });
    const pg = res.results?.[0];
    return pg ? mapCustomer(pg) : null;
  } catch {
    return null;
  }
}
