import {
  fetchCustomers,
  fetchCalls,
  fetchIsKpiCalls,
  fetchContracts,
  fetchTargets,
  notionConfigured,
} from "./notion";
import { buildDashboard } from "./aggregate";
import type { DashboardData, Customer, CallEvent } from "./types";

/** Promise を実行し、失敗したら fallback を返してエラーメッセージを収集する */
async function safe<T>(label: string, fn: () => Promise<T>, fallback: T, errors: string[]): Promise<T> {
  try {
    return await fn();
  } catch (e: any) {
    errors.push(`${label}: ${e?.message ?? "取得失敗"}`);
    return fallback;
  }
}

/** ダッシュボード用に全データを取得・集計 */
export async function getDashboard(): Promise<DashboardData> {
  const errors: string[] = [];
  if (!notionConfigured()) {
    return buildDashboard({ calls: [], customers: [], contracts: [], targets: new Map(), errors: ["NOTION_TOKEN / NOTION_DB_CUSTOMERS が未設定です。.env.local を設定してください。"] });
  }

  const [customers, recCalls, kpiCalls, contracts] = await Promise.all([
    safe("顧客管理", fetchCustomers, [] as Customer[], errors),
    safe("架電記録", fetchCalls, [] as CallEvent[], errors),
    safe("IS架電KPI", fetchIsKpiCalls, [] as CallEvent[], errors),
    safe("契約管理", fetchContracts, [], errors),
  ]);
  await safe("目標設定", fetchTargets, [], errors);

  // 「両方使っている／統合したい」方針: 架電記録 を主ソースとし IS架電KPI を統合。
  const calls: CallEvent[] = [...recCalls, ...kpiCalls];
  const targets = new Map<string, number>(); // 目標は現状 REST 未取得のため空。手動値は将来 env/JSON で。

  return buildDashboard({ calls, customers, contracts, targets, errors });
}

/** 架電一覧（クリック発信）用の顧客リスト */
export async function getCustomers(): Promise<{ customers: Customer[]; errors: string[] }> {
  const errors: string[] = [];
  if (!notionConfigured()) return { customers: [], errors: ["Notion 未設定"] };
  const customers = await safe("顧客管理", fetchCustomers, [] as Customer[], errors);
  return { customers, errors };
}
