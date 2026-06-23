import { unstable_cache } from "next/cache";
import {
  fetchCustomers,
  fetchWorkedCustomers,
  fetchCalls,
  fetchIsKpiCalls,
  fetchContracts,
  notionConfigured,
  getStoredTargets,
} from "./notion";
import { buildDashboard, buildTargets, type TargetsConfig } from "./aggregate";
import type { DashboardData, Customer, CallEvent } from "./types";
import targetsRaw from "@/config/targets.json";

const targetsConfig = targetsRaw as TargetsConfig;

// ── キャッシュ（高速化） ─────────────────────────────────────────
// Notion全件取得は重いため結果をキャッシュ。保存時に revalidateTag で無効化する。
// タグ: "customers"(顧客・メモ), "calls", "contracts", "targets"
// 既定30分キャッシュ（体感最速・Notion負荷減）。保存時は revalidateTag で即時反映するため
// 長めでも メモ/目標/リスト の更新は遅延しない。常に最新にしたい場合は短く設定する。
const TTL = Number(process.env.NOTION_REVALIDATE_SECONDS ?? 1800);
// キー末尾のバージョンは、取得項目（スキーマ）を変えたら上げて旧キャッシュを破棄する。
const cachedCustomers = unstable_cache(fetchCustomers, ["sc-customers-v2"], { revalidate: TTL, tags: ["customers"] });
// ダッシュボードは着手済み顧客のみ（全件28k+は非現実的なため正確・高速に集計）
const cachedWorked = unstable_cache(fetchWorkedCustomers, ["sc-worked-v1"], { revalidate: TTL, tags: ["customers"] });
const cachedCalls = unstable_cache(fetchCalls, ["sc-calls-v2"], { revalidate: TTL, tags: ["calls"] });
const cachedContracts = unstable_cache(fetchContracts, ["sc-contracts-v2"], { revalidate: TTL, tags: ["contracts"] });
const cachedTargets = unstable_cache(getStoredTargets, ["sc-targets-v2"], { revalidate: TTL, tags: ["targets"] });

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

/** 架電一覧（クリック発信）用の顧客リスト */
export async function getCustomers(): Promise<{ customers: Customer[]; errors: string[] }> {
  const errors: string[] = [];
  if (!notionConfigured()) return { customers: [], errors: ["NOTION_TOKEN が未設定です。"] };
  const customers = await safe("顧客管理", cachedCustomers, [] as Customer[], errors);
  return { customers, errors };
}
