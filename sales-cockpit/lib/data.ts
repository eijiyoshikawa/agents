import {
  fetchCustomers,
  fetchCalls,
  fetchIsKpiCalls,
  fetchContracts,
  notionConfigured,
} from "./notion";
import { buildDashboard, buildTargets, type TargetsConfig } from "./aggregate";
import type { DashboardData, Customer, CallEvent } from "./types";
import targetsRaw from "@/config/targets.json";

const targetsConfig = targetsRaw as TargetsConfig;

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

  const [customers, recCalls, kpiCalls, contracts] = await Promise.all([
    safe("顧客管理", fetchCustomers, [] as Customer[], errors),
    safe("架電記録", fetchCalls, [] as CallEvent[], errors),
    safe("IS架電KPI", fetchIsKpiCalls, [] as CallEvent[], errors),
    safe("契約管理", fetchContracts, [], errors),
  ]);

  // 「両方使っている／統合したい」方針: 架電記録 を主ソースとし IS架電KPI を統合。
  const calls: CallEvent[] = [...recCalls, ...kpiCalls];
  // 目標: config/targets.json（日別/月次/全社）を主とし、IS架電KPIの月次目標で補完。
  const targets = buildTargets(calls, targetsConfig);

  return buildDashboard({ calls, customers, contracts, targets, targetsConfig, errors });
}

/** 架電一覧（クリック発信）用の顧客リスト */
export async function getCustomers(): Promise<{ customers: Customer[]; errors: string[] }> {
  const errors: string[] = [];
  if (!notionConfigured()) return { customers: [], errors: ["NOTION_TOKEN が未設定です。"] };
  const customers = await safe("顧客管理", fetchCustomers, [] as Customer[], errors);
  return { customers, errors };
}
