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
  Goals,
  StatusActivity,
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
  jstDateKey,
} from "./period";
import { rate } from "./format";

// 目標設定ファイル(config/targets.json)の型
export type TargetsConfig = {
  workingDaysPerMonth?: number;
  company?: { monthlyAppointments?: number; monthlyContracts?: number };
  dailyCallsDefault?: number;
  dailyCallsByRep?: Record<string, unknown>;
  monthlyCallsByRep?: Record<string, unknown>;
};

/** "_" 始まりのコメントキーや非数値を除いた数値マップを返す */
function numericMap(obj: Record<string, unknown> | undefined): Map<string, number> {
  const m = new Map<string, number>();
  for (const [k, v] of Object.entries(obj ?? {})) {
    if (k.startsWith("_")) continue;
    if (typeof v === "number" && v > 0) m.set(k, v);
  }
  return m;
}

function goal(target: number, actual: number): { target: number; actual: number; achievement: number | null } {
  return { target, actual, achievement: target > 0 ? Number(rate(actual, target).toFixed(0)) : null };
}

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
 * 当月の担当者別「月次 架電目標」を構築。
 * 優先順: ① config.monthlyCallsByRep(直接) → ② config の日別目標×営業日数 →
 *         ③ IS架電KPI「月次目標架電数」(当月)。
 */
export function buildTargets(calls: CallEvent[], config: TargetsConfig): Map<string, number> {
  const cur = currentMonthKey();
  const workingDays = config.workingDaysPerMonth && config.workingDaysPerMonth > 0 ? config.workingDaysPerMonth : 20;
  const dailyDefault = typeof config.dailyCallsDefault === "number" ? config.dailyCallsDefault : 0;
  const dailyByRep = numericMap(config.dailyCallsByRep);
  const monthlyByRep = numericMap(config.monthlyCallsByRep);

  const fromNotion = new Map<string, number>();
  for (const c of calls) {
    if (c.source !== "IS架電KPI" || !c.date || monthKey(c.date) !== cur) continue;
    if (c.rep && c.monthlyTarget && c.monthlyTarget > 0) fromNotion.set(c.rep, c.monthlyTarget);
  }

  const reps = new Set<string>([...fromNotion.keys(), ...dailyByRep.keys(), ...monthlyByRep.keys()]);
  if (dailyDefault > 0) for (const c of calls) if (c.rep) reps.add(c.rep);

  const out = new Map<string, number>();
  for (const rep of reps) {
    const daily = dailyByRep.get(rep) ?? dailyDefault;
    const fromDaily = daily > 0 ? daily * workingDays : 0;
    const v = monthlyByRep.get(rep) || fromDaily || fromNotion.get(rep) || 0;
    if (v > 0) out.set(rep, v);
  }
  return out;
}

/** 日次の架電目標合計（全社）。日別目標を持つ担当の合計。 */
function dailyCallTargetTotal(calls: CallEvent[], targets: Map<string, number>, config: TargetsConfig): number {
  const dailyDefault = typeof config.dailyCallsDefault === "number" ? config.dailyCallsDefault : 0;
  const dailyByRep = numericMap(config.dailyCallsByRep);
  const reps = new Set<string>([...dailyByRep.keys(), ...targets.keys()]);
  if (dailyDefault > 0) for (const c of calls) if (c.rep) reps.add(c.rep);
  let total = 0;
  for (const rep of reps) total += dailyByRep.get(rep) ?? dailyDefault;
  return total;
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

/** 各種目標の達成状況（月次アポ/契約、本日架電）。 */
function buildGoals(
  calls: CallEvent[],
  ts: TargetSummary,
  monthAppts: number,
  newContracts: number,
  targets: Map<string, number>,
  config: TargetsConfig,
): Goals {
  const today = jstDateKey(new Date());
  const todayCalls = calls.filter((c) => c.date && jstDateKey(c.date) === today).length;
  return {
    monthlyCalls: goal(ts.totalTarget, ts.totalCalls),
    monthlyAppointments: goal(config.company?.monthlyAppointments ?? 0, monthAppts),
    monthlyContracts: goal(config.company?.monthlyContracts ?? 0, newContracts),
    dailyCalls: goal(dailyCallTargetTotal(calls, targets, config), todayCalls),
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
  { stage: "リード", statuses: ["アプローチ前"], color: "#94A3B8" },
  { stage: "接触", statuses: ["受付拒否", "不通", "担当者不在", "担当者拒否", "再コール", "クレーム"], color: "#818CF8" },
  { stage: "見込み", statuses: ["見込み客", "資料請求"], color: "#FBBF24" },
  { stage: "アポ獲得", statuses: ["アポイント獲得"], color: "#F472B6" },
  { stage: "提案中", statuses: ["提案中"], color: "#A78BFA" },
  { stage: "商談中", statuses: ["商談中"], color: "#38BDF8" },
  { stage: "契約中", statuses: ["契約中", "パートナー"], color: "#2DD4BF" },
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

// ステータス基準の活動実績（架電ログDBが空の運用向け）
const CONTACTED_STATUS = new Set([
  "不通", "受付拒否", "担当者不在", "担当者拒否", "再コール", "クレーム", "見込み客", "資料請求",
  "アポイント獲得", "提案中", "商談中", "契約中", "契約終了", "失注", "パートナー",
]);
const APPOINTED_STATUS = new Set(["アポイント獲得", "提案中", "商談中", "契約中", "契約終了", "パートナー"]);

export function buildStatusActivity(customers: Customer[]): StatusActivity {
  let contacted = 0;
  let appointments = 0;
  let leads = 0;
  const byResultMap = new Map<string, number>();
  const repMap = new Map<string, { contacted: number; appointments: number }>();

  for (const c of customers) {
    const s = c.status;
    if (!s || s === "アプローチ前") {
      leads++;
      continue;
    }
    if (!CONTACTED_STATUS.has(s)) continue;
    contacted++;
    byResultMap.set(s, (byResultMap.get(s) ?? 0) + 1);
    const appt = APPOINTED_STATUS.has(s);
    if (appt) appointments++;
    const rep = c.isRep ?? "未割当";
    const r = repMap.get(rep) ?? { contacted: 0, appointments: 0 };
    r.contacted += 1;
    if (appt) r.appointments += 1;
    repMap.set(rep, r);
  }

  const byResult = [...byResultMap.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
  const byRep = [...repMap.entries()]
    .map(([rep, v]) => ({
      rep,
      contacted: v.contacted,
      appointments: v.appointments,
      apptRate: Number(rate(v.appointments, v.contacted).toFixed(1)),
    }))
    .sort((a, b) => b.contacted - a.contacted);

  const keys = recentMonthKeys(6);
  const m = new Map<string, number>();
  for (const c of customers) {
    if (!c.appointmentDate) continue;
    const k = monthKey(c.appointmentDate);
    if (k) m.set(k, (m.get(k) ?? 0) + 1);
  }
  const apptMonthly = keys.map((k) => ({ key: k, label: monthLabel(k), appointments: m.get(k) ?? 0 }));

  return {
    total: customers.length,
    leads,
    contacted,
    appointments,
    apptRate: Number(rate(appointments, contacted).toFixed(1)),
    byResult,
    byRep,
    apptMonthly,
  };
}

/** 当月のアポ獲得数（アポイント取得日ベース） */
function apptsThisMonth(customers: Customer[]): number {
  const cur = currentMonthKey();
  let n = 0;
  for (const c of customers) if (c.appointmentDate && monthKey(c.appointmentDate) === cur) n++;
  return n;
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
  targetsConfig: TargetsConfig;
  errors: string[];
}): DashboardData {
  const { calls, customers, contracts, targets, targetsConfig, errors } = input;
  const weekly = buildWeekly(calls);
  const monthly = buildMonthly(calls);
  const cw = currentWeekKey();
  const cm = currentMonthKey();
  const week = weekly.find((p) => p.key === cw) ?? { calls: 0, appointments: 0, apptRate: 0 };
  const month = monthly.find((p) => p.key === cm) ?? { calls: 0, appointments: 0, apptRate: 0 };
  const ck = contractKpis(contracts);
  const reps = buildRepStats(calls, targets);
  const ts = targetSummary(reps);
  const statusActivity = buildStatusActivity(customers);
  // アポ実績はアポイント取得日ベース（架電ログが無いため）
  const goals = buildGoals(calls, ts, apptsThisMonth(customers), ck.newContractsThisMonth, targets, targetsConfig);

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
    statusActivity,
    targetSummary: ts,
    goals,
    funnel: buildFunnel(customers),
    statusBreakdown: buildStatusBreakdown(customers),
    breakdowns: buildBreakdowns(customers),
    mrrTrend: buildMrrTrend(contracts),
  };
}
