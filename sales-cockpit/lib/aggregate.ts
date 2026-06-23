import type {
  CallEvent,
  Customer,
  Contract,
  SeriesPoint,
  RepStat,
  FunnelStage,
  DashboardData,
  Breakdown,
  Breakdowns,
  TargetSummary,
} from "./types";
import {
  weekKey,
  monthKey,
  recentWeekKeys,
  recentMonthKeys,
  weekLabel,
  monthLabel,
  currentWeekKey,
  currentMonthKey,
} from "./period";
import { rate } from "./format";

type Bucket = { calls: number; appointments: number };

function emptyBucket(): Bucket {
  return { calls: 0, appointments: 0 };
}

/** 架電イベントをキー関数でバケット化 */
function bucketBy(calls: CallEvent[], keyOf: (c: CallEvent) => string | null): Map<string, Bucket> {
  const map = new Map<string, Bucket>();
  for (const c of calls) {
    if (!c.date) continue;
    const k = keyOf(c);
    if (!k) continue;
    const b = map.get(k) ?? emptyBucket();
    b.calls += 1;
    if (c.isAppointment) b.appointments += 1;
    map.set(k, b);
  }
  return map;
}

function toSeries(keys: string[], buckets: Map<string, Bucket>, labelOf: (k: string) => string): SeriesPoint[] {
  return keys.map((k) => {
    const b = buckets.get(k) ?? emptyBucket();
    return {
      key: k,
      label: labelOf(k),
      calls: b.calls,
      appointments: b.appointments,
      apptRate: Number(rate(b.appointments, b.calls).toFixed(1)),
    };
  });
}

export function buildWeekly(calls: CallEvent[], n = 12): SeriesPoint[] {
  return toSeries(recentWeekKeys(n), bucketBy(calls, (c) => weekKey(c.date!)), weekLabel);
}

export function buildMonthly(calls: CallEvent[], n = 6): SeriesPoint[] {
  return toSeries(recentMonthKeys(n), bucketBy(calls, (c) => monthKey(c.date!)), monthLabel);
}

/** 担当者別（当月）集計。targets: rep→当月目標架電数 */
export function buildRepStats(calls: CallEvent[], targets: Map<string, number>): RepStat[] {
  const cur = currentMonthKey();
  const map = new Map<string, Bucket>();
  // 架電のある担当を集計
  for (const c of calls) {
    if (!c.date || monthKey(c.date) !== cur) continue;
    const rep = c.rep ?? "未割当";
    const b = map.get(rep) ?? emptyBucket();
    b.calls += 1;
    if (c.isAppointment) b.appointments += 1;
    map.set(rep, b);
  }
  // 目標だけある担当（当月架電0）も行として出す
  for (const rep of targets.keys()) {
    if (!map.has(rep)) map.set(rep, emptyBucket());
  }
  const stats: RepStat[] = [...map.entries()].map(([rep, b]) => {
    const target = targets.get(rep) ?? 0;
    return {
      rep,
      calls: b.calls,
      appointments: b.appointments,
      apptRate: Number(rate(b.appointments, b.calls).toFixed(1)),
      target,
      achievement: target > 0 ? Number(rate(b.calls, target).toFixed(0)) : null,
    };
  });
  return stats.sort((a, b) => b.calls - a.calls);
}

/**
 * 当月の目標架電数マップを構築。
 * 優先順: ① IS架電KPI の「月次目標架電数」(当月) → ② config の担当別 → ③ config の既定値。
 */
export function buildTargets(
  calls: CallEvent[],
  config: { defaultMonthly?: number; monthlyTargetByRep?: Record<string, number> },
): Map<string, number> {
  const cur = currentMonthKey();
  const fromNotion = new Map<string, number>();
  for (const c of calls) {
    if (c.source !== "IS架電KPI" || !c.date || monthKey(c.date) !== cur) continue;
    if (c.rep && c.monthlyTarget && c.monthlyTarget > 0) fromNotion.set(c.rep, c.monthlyTarget);
  }
  const out = new Map<string, number>();
  const cfgByRep = config.monthlyTargetByRep ?? {};
  const reps = new Set<string>([...fromNotion.keys(), ...Object.keys(cfgByRep)]);
  for (const rep of reps) {
    const v = fromNotion.get(rep) ?? cfgByRep[rep] ?? config.defaultMonthly ?? 0;
    if (v > 0) out.set(rep, v);
  }
  return out;
}

function targetSummary(reps: RepStat[]): TargetSummary {
  const totalTarget = reps.reduce((s, r) => s + r.target, 0);
  const totalCalls = reps.reduce((s, r) => s + r.calls, 0);
  return {
    totalTarget,
    totalCalls,
    achievement: totalTarget > 0 ? Number(rate(totalCalls, totalTarget).toFixed(0)) : null,
  };
}

// ── 汎用 項目別内訳（分析の土台） ───────────────────────────────
/** 任意フィールドで件数を集計し、多い順に返す。null/空は「(未設定)」へ。 */
export function groupCount<T>(items: T[], keyOf: (x: T) => string | null | undefined, limit = 0): Breakdown[] {
  const counts = new Map<string, number>();
  for (const it of items) {
    const k = keyOf(it) || "(未設定)";
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const arr = [...counts.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
  return limit > 0 ? arr.slice(0, limit) : arr;
}

function buildBreakdowns(customers: Customer[]): Breakdowns {
  return {
    rank: groupCount(customers, (c) => c.rank),
    industry: groupCount(customers, (c) => c.industry, 15),
    method: groupCount(customers, (c) => c.method),
    phase: groupCount(customers, (c) => c.phase),
    pref: groupCount(customers, (c) => c.pref, 15),
    isRep: groupCount(customers, (c) => c.isRep),
  };
}

// 顧客ステータス → ファネル段マッピング
const FUNNEL_ORDER: { stage: string; statuses: string[]; color: string }[] = [
  { stage: "リード", statuses: ["アプローチ前"], color: "#7A7A85" },
  { stage: "接触", statuses: ["受付拒否", "不通", "担当者不在", "担当者拒否", "再コール", "クレーム"], color: "#5566FF" },
  { stage: "見込み", statuses: ["見込み客", "資料請求"], color: "#E8A93D" },
  { stage: "アポ獲得", statuses: ["アポイント獲得"], color: "#EC4899" },
  { stage: "提案中", statuses: ["提案中"], color: "#7C3AED" },
  { stage: "商談中", statuses: ["商談中"], color: "#147A4A" },
  { stage: "契約中", statuses: ["契約中", "パートナー"], color: "#0F5132" },
];

export function buildFunnel(customers: Customer[]): FunnelStage[] {
  const counts = new Map<string, number>();
  for (const c of customers) {
    if (!c.status) continue;
    counts.set(c.status, (counts.get(c.status) ?? 0) + 1);
  }
  return FUNNEL_ORDER.map((f) => ({
    stage: f.stage,
    count: f.statuses.reduce((sum, s) => sum + (counts.get(s) ?? 0), 0),
    color: f.color,
  }));
}

export function buildStatusBreakdown(customers: Customer[]): { status: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const c of customers) {
    const s = c.status ?? "(未設定)";
    counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);
}

// ── 契約 / MRR ──────────────────────────────────────────────────
const ACTIVE_CONTRACT = new Set(["試用期間", "契約中", "更新待ち"]);

function isActiveInMonth(c: Contract, mk: string): boolean {
  if (c.monthly <= 0) return false;
  const startM = c.start ? monthKey(c.start) : null;
  const endM = c.end ? monthKey(c.end) : null;
  if (startM && startM > mk) return false; // まだ開始前
  if (endM && endM < mk) return false; // すでに終了
  return true;
}

export function buildMrrTrend(contracts: Contract[], n = 6): { key: string; label: string; mrr: number; active: number }[] {
  return recentMonthKeys(n).map((mk) => {
    let mrr = 0;
    let active = 0;
    for (const c of contracts) {
      if (isActiveInMonth(c, mk)) {
        mrr += c.monthly;
        active += 1;
      }
    }
    return { key: mk, label: monthLabel(mk), mrr, active };
  });
}

function contractKpis(contracts: Contract[]) {
  const cur = currentMonthKey();
  const activeContracts = contracts.filter((c) => c.status && ACTIVE_CONTRACT.has(c.status));
  const mrr = activeContracts.reduce((s, c) => s + c.monthly, 0);
  const newContractsThisMonth = contracts.filter((c) => c.start && monthKey(c.start) === cur).length;
  return { activeContracts: activeContracts.length, mrr, newContractsThisMonth };
}

// ── 全体ビルド ──────────────────────────────────────────────────
export function buildDashboard(input: {
  calls: CallEvent[];
  customers: Customer[];
  contracts: Contract[];
  targets: Map<string, number>;
  errors: string[];
}): DashboardData {
  const { calls, customers, contracts, targets, errors } = input;
  const weekly = buildWeekly(calls);
  const monthly = buildMonthly(calls);
  const cw = currentWeekKey();
  const cm = currentMonthKey();
  const week = weekly.find((p) => p.key === cw) ?? { calls: 0, appointments: 0, apptRate: 0 };
  const month = monthly.find((p) => p.key === cm) ?? { calls: 0, appointments: 0, apptRate: 0 };
  const ck = contractKpis(contracts);
  const reps = buildRepStats(calls, targets);

  return {
    generatedAt: new Date().toISOString(),
    ok: errors.length === 0,
    errors,
    kpi: {
      weekCalls: week.calls,
      weekAppts: week.appointments,
      weekApptRate: week.apptRate,
      monthCalls: month.calls,
      monthAppts: month.appointments,
      monthApptRate: month.apptRate,
      ...ck,
    },
    weekly,
    monthly,
    reps,
    targetSummary: targetSummary(reps),
    funnel: buildFunnel(customers),
    statusBreakdown: buildStatusBreakdown(customers),
    breakdowns: buildBreakdowns(customers),
    mrrTrend: buildMrrTrend(contracts),
  };
}
