// 正規化済みドメイン型。Notion のスキーマ依存を lib/notion.ts に閉じ込め、UI/集計はこの型のみ参照する。

/** 架電1件（📞架電記録 / IS架電KPI を統合した共通形） */
export type CallEvent = {
  id: string;
  date: string | null; // ISO
  rep: string | null; // 担当者
  result: string | null; // 生の結果文字列
  isAppointment: boolean; // アポ獲得か
  isConnected: boolean; // 通話/接続できたか
  source: "架電記録" | "IS架電KPI";
};

/** 顧客（📊DB_顧客管理） */
export type Customer = {
  id: string;
  url: string;
  name: string;
  phone: string | null;
  status: string | null;
  rank: string | null; // 見込み度合い A/B/C/D
  industry: string | null;
  isRep: string | null; // IS担当
  sRep: string | null; // S担当
  method: string | null; // 営業手法
  callCount: number | null; // 架電回数(rollup)
  lastCallDate: string | null; // 最終架電日(rollup)
  appointmentDate: string | null; // アポイント取得日
};

/** 契約（🤝契約管理DB） */
export type Contract = {
  id: string;
  name: string;
  status: string | null; // 試用期間/契約中/更新待ち/解約済み...
  monthly: number; // 月額料金
  start: string | null; // 契約開始日
  end: string | null; // 契約終了日
  kinds: string[]; // 契約種別
  churnRisk: string | null; // 解約リスク
  nextRenewal: string | null; // 次回更新日
};

/** IS別の月次目標（🎯目標設定） */
export type CallTarget = { rep: string; month: string; target: number };

/** 時系列1点 */
export type SeriesPoint = {
  key: string; // 並び替え用キー
  label: string; // 表示ラベル
  calls: number;
  appointments: number;
  apptRate: number; // %
};

/** 担当者別集計 */
export type RepStat = {
  rep: string;
  calls: number;
  appointments: number;
  apptRate: number; // %
  target?: number; // 当月目標架電数
  achievement?: number; // 目標達成率 %
};

/** ファネル段 */
export type FunnelStage = { stage: string; count: number; color: string };

/** ダッシュボード全体データ */
export type DashboardData = {
  generatedAt: string;
  ok: boolean;
  errors: string[];
  kpi: {
    weekCalls: number;
    weekAppts: number;
    weekApptRate: number;
    monthCalls: number;
    monthAppts: number;
    monthApptRate: number;
    activeContracts: number;
    mrr: number;
    newContractsThisMonth: number;
  };
  weekly: SeriesPoint[];
  monthly: SeriesPoint[];
  reps: RepStat[];
  funnel: FunnelStage[];
  statusBreakdown: { status: string; count: number }[];
  mrrTrend: { key: string; label: string; mrr: number; active: number }[];
};
