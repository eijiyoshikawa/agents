import { unstable_cache } from "next/cache";
import {
  fetchCustomersSlim,
  fetchRecentlyEditedSlim,
  fetchAppointedSlim,
  fetchPipelineSlim,
  fetchWorkedCustomers,
  fetchFollowups,
  fetchCalls,
  fetchIsKpiCalls,
  fetchContracts,
  fetchCustomerFieldOptions,
  notionConfigured,
  getStoredTargets,
} from "./notion";
import {
  dbConfigured,
  dbGetAllSlim,
  dbGetContracts,
  dbSearchCustomers,
  dbGetBreakdowns,
  dbGetPipelineSlim,
  dbGetAppointedSlim,
  dbGetActiveSince,
} from "./db";
import { PIPELINE_STATUSES } from "./notion";
import { EXCLUDED_REPS } from "./reps";
import { buildDashboard, buildTargets, buildBreakdowns, type TargetsConfig } from "./aggregate";
import { buildTimingBoard, type TimingBoard } from "./timing";
import { searchInMemory } from "./search";
import { computeDuplicates, agencyReason } from "./leadflags";
import type { DashboardData, Customer, ListCustomer, CallEvent, Contract, Breakdowns, SearchParams, SearchResult } from "./types";
import targetsRaw from "@/config/targets.json";

const targetsConfig = targetsRaw as TargetsConfig;

// ── キャッシュ（高速化） ─────────────────────────────────────────
// Notion全件取得は重いため結果をキャッシュ。保存時に revalidateTag で無効化する。
// タグ: "customers"(顧客・メモ), "calls", "contracts", "targets"
// 既定30分キャッシュ（体感最速・Notion負荷減）。保存時は revalidateTag で即時反映するため
// 長めでも メモ/目標/リスト の更新は遅延しない。常に最新にしたい場合は短く設定する。
const TTL = Number(process.env.NOTION_REVALIDATE_SECONDS ?? 1800);
// 重い「全2.8万件」取得は編集では無効化せず、cron(/api/warm)が裏で更新する（ユーザーは常に温まったキャッシュを引く）。
// そのため専用タグ "customers-full" ＋ 長めのTTL。編集系は "customers"（軽量側）だけを無効化する。
const TTL_FULL = Number(process.env.NOTION_FULL_REVALIDATE_SECONDS ?? 86400);
// キー末尾のバージョンは、取得項目（スキーマ）を変えたら上げて旧キャッシュを破棄する。
// 一覧/分析は軽量版（必要プロパティのみ）でキャッシュ。詳細はIDで都度取得する。
const cachedCustomersSlim = unstable_cache(fetchCustomersSlim, ["sc-customers-slim-v1"], { revalidate: TTL_FULL, tags: ["customers-full"] });
// ダッシュボードは着手済み顧客のみ（全件28k+は非現実的なため正確・高速に集計）
const cachedWorked = unstable_cache(fetchWorkedCustomers, ["sc-worked-v1"], { revalidate: TTL, tags: ["customers"] });
// 今日/週次/サマリ用の軽量取得（最近更新・アポ有り・商談ステータス）。編集で即更新したいので "customers" タグ。
const cachedRecentEdited = unstable_cache(fetchRecentlyEditedSlim, ["sc-recent-v1"], { revalidate: TTL, tags: ["customers"] });
const cachedAppointed = unstable_cache(fetchAppointedSlim, ["sc-appointed-v1"], { revalidate: TTL, tags: ["customers"] });
const cachedPipeline = unstable_cache(fetchPipelineSlim, ["sc-pipeline-v1"], { revalidate: TTL, tags: ["customers"] });
const cachedCalls = unstable_cache(fetchCalls, ["sc-calls-v2"], { revalidate: TTL, tags: ["calls"] });
const cachedContracts = unstable_cache(fetchContracts, ["sc-contracts-v2"], { revalidate: TTL, tags: ["contracts"] });
const cachedTargets = unstable_cache(getStoredTargets, ["sc-targets-v2"], { revalidate: TTL, tags: ["targets"] });
const cachedFollowups = unstable_cache(fetchFollowups, ["sc-followups-v1"], { revalidate: TTL, tags: ["customers"] });
const cachedFieldOptions = unstable_cache(fetchCustomerFieldOptions, ["sc-fieldopts-v1"], { revalidate: 3600, tags: ["schema"] });

// Postgres(Neon)が設定されていればDBから読む（最速）。未設定・DB読取失敗時はNotionキャッシュにフォールバック。
const cachedDbAll = unstable_cache(dbGetAllSlim, ["sc-db-all-v1"], { revalidate: TTL_FULL, tags: ["customers-full"] });
const cachedDbContracts = unstable_cache(dbGetContracts, ["sc-db-contracts-v1"], { revalidate: TTL, tags: ["contracts"] });
async function loadAllSlim(): Promise<ListCustomer[]> {
  if (!dbConfigured()) return cachedCustomersSlim();
  try {
    return await cachedDbAll();
  } catch (e) {
    // Neonの転送量超過(HTTP 402)やDB障害時は画面を止めず Notion 経路へ自動フォールバック。
    console.error("[data] DB customers read failed, falling back to Notion:", (e as Error)?.message);
    return cachedCustomersSlim();
  }
}
async function loadContracts(): Promise<Contract[]> {
  if (!dbConfigured()) return cachedContracts();
  try {
    return await cachedDbContracts();
  } catch (e) {
    console.error("[data] DB contracts read failed, falling back to Notion:", (e as Error)?.message);
    return cachedContracts();
  }
}

// 検索用インデックス。重い全件走査（重複判定・人材紹介判定・正規化）を
// データ単位で1回だけ計算してキャッシュする。ページ送り・検索の毎リクエストで
// 再計算しないためのメモ化（tag "customers-full" で同期/編集時に無効化）。
type SearchIndex = { all: ListCustomer[]; dupIds: string[]; agency: [string, string][] };
async function buildSearchIndex(): Promise<SearchIndex> {
  const all = await loadAllSlim();
  const { dupIds } = computeDuplicates(all);
  const agency: [string, string][] = [];
  for (const c of all) {
    const r = agencyReason(c);
    if (r) agency.push([c.id, r]);
  }
  return { all, dupIds: [...dupIds], agency };
}
const cachedSearchIndex = unstable_cache(buildSearchIndex, ["sc-search-index-v1"], {
  revalidate: TTL_FULL,
  tags: ["customers-full"],
});

/** 顧客の編集用フィールド選択肢（Notionスキーマ由来） */
export async function getFieldOptions(): Promise<Record<string, string[]>> {
  if (!notionConfigured()) return {};
  try {
    return await cachedFieldOptions();
  } catch {
    return {};
  }
}

/** フォロー対象（再コール・次回フォロー日あり） */
export async function getFollowups(): Promise<{ customers: Customer[]; errors: string[] }> {
  const errors: string[] = [];
  if (!notionConfigured()) return { customers: [], errors: ["NOTION_TOKEN が未設定です。"] };
  const customers = await safe("フォロー対象", cachedFollowups, [] as Customer[], errors);
  return { customers, errors };
}

/** Promise を実行し、失敗したら fallback を返してエラーメッセージを収集する */
async function safe<T>(label: string, fn: () => Promise<T>, fallback: T, errors: string[]): Promise<T> {
  try {
    return await fn();
  } catch (e: any) {
    errors.push(`${label}: ${e?.message ?? "取得失敗"}`);
    return fallback;
  }
}

function emptyDashboard(message: string): DashboardData {
  return buildDashboard({ calls: [], customers: [], contracts: [], targets: new Map(), targetsConfig, errors: [message] });
}

/** ダッシュボード用に全データを取得・集計 */
export async function getDashboard(): Promise<DashboardData> {
  const errors: string[] = [];
  if (!notionConfigured()) {
    return emptyDashboard("NOTION_TOKEN が未設定です。Vercel の環境変数に NOTION_TOKEN を設定してください。");
  }

  const [customers, recCalls, contracts] = await Promise.all([
    safe("顧客管理", cachedWorked, [] as Customer[], errors),
    safe("架電記録", cachedCalls, [] as CallEvent[], errors),
    safe("契約管理", loadContracts, [] as Contract[], errors),
  ]);
  // IS架電KPI はマルチソースDBで現APIバージョン非対応のことがあるため、失敗しても警告は出さず無視する。
  let kpiCalls: CallEvent[] = [];
  try {
    kpiCalls = await fetchIsKpiCalls();
  } catch {
    kpiCalls = [];
  }

  // 「両方使っている／統合したい」方針: 架電記録 を主ソースとし IS架電KPI を統合。
  const calls: CallEvent[] = [...recCalls, ...kpiCalls];
  // 目標: サイト内設定（Notion 目標設定DB）を最優先。無ければ config/targets.json。
  let effectiveConfig: TargetsConfig = targetsConfig;
  try {
    const stored = await cachedTargets();
    if (stored) {
      effectiveConfig = {
        workingDaysPerMonth: stored.workingDaysPerMonth,
        company: {
          monthlyAppointments: stored.monthlyAppointments,
          monthlyContracts: stored.monthlyContracts,
          monthlyContractsSns: stored.monthlyContractsSns,
          monthlyContractsAgency: stored.monthlyContractsAgency,
        },
        dailyCallsDefault: stored.dailyCallsDefault,
        dailyCallsByRep: stored.dailyCallsByRep,
        monthlyCallsByRep: {},
      };
    }
  } catch {
    /* 目標設定DB未接続などは静かに無視し、ファイル設定にフォールバック */
  }
  const targets = buildTargets(calls, effectiveConfig);

  return buildDashboard({ calls, customers, contracts, targets, targetsConfig: effectiveConfig, errors });
}

/** 分析（全顧客の項目別内訳。母集団＝全件） */
export async function getAnalytics(): Promise<{ breakdowns: Breakdowns; total: number; errors: string[] }> {
  const errors: string[] = [];
  if (!notionConfigured()) return { breakdowns: buildBreakdowns([]), total: 0, errors: ["NOTION_TOKEN が未設定です。"] };
  // 高速経路: DB内で GROUP BY 集計（全件をアプリに読み込まない）
  if (dbConfigured()) {
    try {
      const r = await dbGetBreakdowns(EXCLUDED_REPS);
      return { ...r, errors };
    } catch (e) {
      console.error("[data] DB breakdowns failed, falling back:", (e as Error)?.message);
    }
  }
  const customers = await safe("顧客管理", loadAllSlim, [] as ListCustomer[], errors);
  return { breakdowns: buildBreakdowns(customers), total: customers.length, errors };
}

/** 架電記録（日付つき実績。目標vs実績の突合用） */
export async function getCalls(): Promise<{ calls: CallEvent[]; errors: string[] }> {
  const errors: string[] = [];
  if (!notionConfigured()) return { calls: [], errors: ["NOTION_TOKEN が未設定です。"] };
  const calls = await safe("架電記録", cachedCalls, [] as CallEvent[], errors);
  return { calls, errors };
}

/** 架電・アポのタイミング分析（曜日×時間帯）。架電記録＋IS架電KPIを集計。 */
export async function getTimingBoard(): Promise<{ board: TimingBoard; errors: string[] }> {
  const errors: string[] = [];
  if (!notionConfigured()) {
    return { board: buildTimingBoard([]), errors: ["NOTION_TOKEN が未設定です。"] };
  }
  const recCalls = await safe("架電記録", cachedCalls, [] as CallEvent[], errors);
  let kpiCalls: CallEvent[] = [];
  try {
    kpiCalls = await fetchIsKpiCalls();
  } catch {
    kpiCalls = [];
  }
  return { board: buildTimingBoard([...recCalls, ...kpiCalls]), errors };
}

/** 契約一覧（MRR担当者別など） */
export async function getContracts(): Promise<{ contracts: Contract[]; errors: string[] }> {
  const errors: string[] = [];
  if (!notionConfigured()) return { contracts: [], errors: ["NOTION_TOKEN が未設定です。"] };
  const contracts = await safe("契約管理", loadContracts, [] as Contract[], errors);
  return { contracts, errors };
}

/** 架電一覧（クリック発信）用の顧客リスト（軽量版・詳細はIDで都度取得） */
export async function getCustomers(): Promise<{ customers: ListCustomer[]; errors: string[] }> {
  const errors: string[] = [];
  if (!notionConfigured()) return { customers: [], errors: ["NOTION_TOKEN が未設定です。"] };
  const customers = await safe("顧客管理", loadAllSlim, [] as ListCustomer[], errors);
  return { customers, errors };
}

/** 架電リスト用：サーバー側で絞り込み・並べ替え・ページングし1ページだけ返す（全件をクライアントへ送らない）。 */
export async function searchCustomers(params: SearchParams): Promise<{ result: SearchResult; errors: string[] }> {
  const errors: string[] = [];
  const empty: SearchResult = { rows: [], total: 0, totalDup: 0, totalAgency: 0, page: params.page ?? 1, pageSize: params.pageSize ?? 50 };
  if (!notionConfigured() && !dbConfigured()) return { result: empty, errors: ["NOTION_TOKEN が未設定です。"] };

  // 高速経路: DB(Neon)側でSQL検索・ページング（全件をアプリに読み込まない）。
  if (dbConfigured()) {
    try {
      return { result: await dbSearchCustomers(params), errors };
    } catch (e) {
      // Neon障害/転送量超過(402)時は Notion 経路にフォールバック（遅いが画面は止めない）。
      console.error("[data] DB search failed, falling back to Notion:", (e as Error)?.message);
    }
  }

  // フォールバック: Notion全件をメモ化して従来のメモリ内検索。
  const idx = await safe(
    "顧客管理",
    cachedSearchIndex,
    { all: [] as ListCustomer[], dupIds: [] as string[], agency: [] as [string, string][] },
    errors,
  );
  const pre = { dupIds: new Set(idx.dupIds), agency: new Map(idx.agency) };
  return { result: searchInMemory(idx.all, params, pre), errors };
}

function minus1(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d - 1));
  const p = (n: number) => String(n).padStart(2, "0");
  return `${dt.getUTCFullYear()}-${p(dt.getUTCMonth() + 1)}-${p(dt.getUTCDate())}`;
}

function dedupeById(list: ListCustomer[]): ListCustomer[] {
  const m = new Map<string, ListCustomer>();
  for (const c of list) m.set(c.id, c);
  return [...m.values()];
}

/** 今日/週次サマリ用の顧客集合（最近更新 ∪ アポ有り）。全2.8万件取得を避ける軽量版。 */
export async function getSummaryCustomers(sinceYmd: string): Promise<{ customers: ListCustomer[]; errors: string[] }> {
  const errors: string[] = [];
  if (!notionConfigured()) return { customers: [], errors: ["NOTION_TOKEN が未設定です。"] };
  // DBがあれば「対象月の月初以降に動きのあった顧客だけ」をSQLで絞って取得（全件転送を避ける）。
  //   statsForRange は 当日/当週 と 月初〜当日(MTD) を集計するため、
  //   sinceYmd を含む月の月初 −1日 まで遡れば必要範囲を全てカバーできる。
  if (dbConfigured()) {
    try {
      const monthStart = `${sinceYmd.slice(0, 7)}-01`;
      const customers = await dbGetActiveSince(minus1(monthStart));
      return { customers, errors };
    } catch (e) {
      console.error("[data] DB summary customers failed, falling back:", (e as Error)?.message);
      const customers = await safe("顧客管理", loadAllSlim, [] as ListCustomer[], errors);
      return { customers, errors };
    }
  }
  const since = minus1(sinceYmd); // UTC/JSTの差を吸収するため1日多めに取得（集計側でJST日付に絞る）
  const [recent, appointed] = await Promise.all([
    safe("最近更新", () => cachedRecentEdited(since), [] as ListCustomer[], errors),
    safe("アポ有り", cachedAppointed, [] as ListCustomer[], errors),
  ]);
  return { customers: dedupeById([...recent, ...appointed]), errors };
}

/** パイプライン用（商談ステータスのみ・軽量） */
export async function getPipelineCustomers(): Promise<{ customers: ListCustomer[]; errors: string[] }> {
  const errors: string[] = [];
  if (!notionConfigured()) return { customers: [], errors: ["NOTION_TOKEN が未設定です。"] };
  if (dbConfigured()) {
    try {
      // 商談ステータスの顧客だけをSQLで取得（全件転送を避ける）
      const customers = await dbGetPipelineSlim(PIPELINE_STATUSES);
      return { customers, errors };
    } catch (e) {
      console.error("[data] DB pipeline failed, falling back:", (e as Error)?.message);
      const customers = await safe("顧客管理", loadAllSlim, [] as ListCustomer[], errors);
      return { customers, errors };
    }
  }
  const customers = await safe("商談", cachedPipeline, [] as ListCustomer[], errors);
  return { customers, errors };
}

/** アポ有り顧客のみ（履歴のアポ月次など・軽量） */
export async function getAppointedCustomers(): Promise<{ customers: ListCustomer[]; errors: string[] }> {
  const errors: string[] = [];
  if (!notionConfigured()) return { customers: [], errors: ["NOTION_TOKEN が未設定です。"] };
  if (dbConfigured()) {
    try {
      // アポ取得日ありの顧客だけをSQLで取得（全件転送を避ける）
      const customers = await dbGetAppointedSlim();
      return { customers, errors };
    } catch (e) {
      console.error("[data] DB appointed failed, falling back:", (e as Error)?.message);
      const customers = await safe("顧客管理", loadAllSlim, [] as ListCustomer[], errors);
      return { customers, errors };
    }
  }
  const customers = await safe("アポ有り", cachedAppointed, [] as ListCustomer[], errors);
  return { customers, errors };
}
