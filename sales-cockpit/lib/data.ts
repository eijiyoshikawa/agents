import { unstable_cache } from "next/cache";
import {
  fetchCustomersSlim,
  fetchWorkedCustomers,
  fetchFollowups,
  fetchCalls,
  fetchIsKpiCalls,
  fetchContracts,
  fetchCustomerFieldOptions,
  notionConfigured,
  getStoredTargets,
} from "./notion";
import { buildDashboard, buildTargets, buildBreakdowns, type TargetsConfig } from "./aggregate";
import type { DashboardData, Customer, ListCustomer, CallEvent, Contract, Breakdowns } from "./types";
import targetsRaw from "@/config/targets.json";

const targetsConfig = targetsRaw as TargetsConfig;

// ── キャッシュ（高速化） ─────────────────────────────────────────
// Notion全件取得は重いため結果をキャッシュ。保存時に revalidateTag で無効化する。
// タグ: "customers"(顧客・メモ), "calls", "contracts", "targets"
// 既定30分キャッシュ（体感最速・Notion負荷減）。保存時は revalidateTag で即時反映するため
// 長めでも メモ/目標/リスト の更新は遅延しない。常に最新にしたい場合は短く設定する。
const TTL = Number(process.env.NOTION_REVALIDATE_SECONDS ?? 3600);
// キー末尾のバージョンは、取得項目（スキーマ）を変えたら上げて旧キャッシュを破棄する。
// 一覧/分析は軽量版（必要プロパティのみ）でキャッシュ。詳細はIDで都度取得する。
const cachedCustomersSlim = unstable_cache(fetchCustomersSlim, ["sc-customers-slim-v1"], { revalidate: TTL, tags: ["customers"] });
// ダッシュボードは着手済み顧客のみ（全件28k+は非現実的なため正確・高速に集計）
const cachedWorked = unstable_cache(fetchWorkedCustomers, ["sc-worked-v1"], { revalidate: TTL, tags: ["customers"] });
const cachedCalls = unstable_cache(fetchCalls, ["sc-calls-v2"], { revalidate: TTL, tags: ["calls"] });
const cachedContracts = unstable_cache(fetchContracts, ["sc-contracts-v2"], { revalidate: TTL, tags: ["contracts"] });
const cachedTargets = unstable_cache(getStoredTargets, ["sc-targets-v2"], { revalidate: TTL, tags: ["targets"] });
const cachedFollowups = unstable_cache(fetchFollowups, ["sc-followups-v1"], { revalidate: TTL, tags: ["customers"] });
const cachedFieldOptions = unstable_cache(fetchCustomerFieldOptions, ["sc-fieldopts-v1"], { revalidate: 3600, tags: ["schema"] });

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
    safe("契約管理", cachedContracts, [], errors),
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
        company: { monthlyAppointments: stored.monthlyAppointments, monthlyContracts: stored.monthlyContracts },
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
  const customers = await safe("顧客管理", cachedCustomersSlim, [] as ListCustomer[], errors);
  return { breakdowns: buildBreakdowns(customers), total: customers.length, errors };
}

/** 架電記録（日付つき実績。目標vs実績の突合用） */
export async function getCalls(): Promise<{ calls: CallEvent[]; errors: string[] }> {
  const errors: string[] = [];
  if (!notionConfigured()) return { calls: [], errors: ["NOTION_TOKEN が未設定です。"] };
  const calls = await safe("架電記録", cachedCalls, [] as CallEvent[], errors);
  return { calls, errors };
}

/** 契約一覧（MRR担当者別など） */
export async function getContracts(): Promise<{ contracts: Contract[]; errors: string[] }> {
  const errors: string[] = [];
  if (!notionConfigured()) return { contracts: [], errors: ["NOTION_TOKEN が未設定です。"] };
  const contracts = await safe("契約管理", cachedContracts, [] as Contract[], errors);
  return { contracts, errors };
}

/** 架電一覧（クリック発信）用の顧客リスト（軽量版・詳細はIDで都度取得） */
export async function getCustomers(): Promise<{ customers: ListCustomer[]; errors: string[] }> {
  const errors: string[] = [];
  if (!notionConfigured()) return { customers: [], errors: ["NOTION_TOKEN が未設定です。"] };
  const customers = await safe("顧客管理", cachedCustomersSlim, [] as ListCustomer[], errors);
  return { customers, errors };
}
