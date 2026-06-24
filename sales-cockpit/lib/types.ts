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
  monthlyTarget: number | null; // IS架電KPIの月次目標架電数（その月/担当）
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
  phase: string | null; // 企業フェーズ
  pref: string | null; // 都道府県
  isRep: string | null; // IS担当
  sRep: string | null; // S担当
  csRep: string | null; // CS担当
  method: string | null; // 営業手法
  callCount: number | null; // 架電回数(rollup)
  lastCallDate: string | null; // 最終架電日(rollup)
  appointmentDate: string | null; // アポイント取得日
  address: string | null; // 住所
  email: string | null; // メールアドレス
  companyUrl: string | null; // 会社URL
  rep3: string | null; // 代表者名
  memo: string | null; // メモ
  sns: string[]; // SNS（運用チャネル）
  founded: number | null; // 設立年
  employees: number | null; // 従業員数
  listing: string | null; // 上場区分
  recruitPage: string | null; // 採用ページURL
  media: string[]; // 掲載元メディア
  lastEdited: string | null; // 最終更新日時
  nextFollow: string | null; // 次回フォロー日
  confirm: string | null; // 確認状況（重複チェック）
};

/** 一覧/分析用の軽量顧客（必要項目のみ・転送量削減）。詳細はIDで都度取得する。 */
export type ListCustomer = {
  id: string;
  url: string;
  name: string;
  phone: string | null;
  status: string | null;
  rank: string | null;
  industry: string | null;
  phase: string | null;
  method: string | null;
  pref: string | null;
  isRep: string | null;
  sRep: string | null;
  callCount: number | null;
  lastCallDate: string | null;
  appointmentDate: string | null;
  lastEdited: string | null; // 最終更新日時（活動日の代理指標）
  address: string | null;
  confirm: string | null;
};

/** サーバー側検索の1行（重複/人材紹介フラグ付き） */
export type SearchRow = ListCustomer & { dup: boolean; agency: string | null };

/** サーバー側検索パラメータ */
export type SearchParams = {
  q?: string;
  rep?: string;
  status?: string;
  rank?: string;
  industry?: string;
  agencyMode?: "all" | "exclude" | "only";
  dupOnly?: boolean;
  sort?: string;
  dir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};

/** サーバー側検索の結果（1ページ分） */
export type SearchResult = {
  rows: SearchRow[];
  total: number;
  totalDup: number;
  totalAgency: number;
  page: number;
  pageSize: number;
};

/** 汎用カテゴリ内訳（項目別グラフ用の土台） */
export type Breakdown = { label: string; count: number };

/** 担当者別 ステータス実績 */
export type StatusRep = { rep: string; contacted: number; appointments: number; apptRate: number };

/** ダッシュボードの内訳（ドリルダウン）表示用の軽量顧客 */
export type DrillCustomer = {
  id: string;
  name: string;
  url: string;
  status: string | null;
  isRep: string | null;
  phone: string | null;
  appointmentDate: string | null;
  industry: string | null;
  lastEdited: string | null;
};

/** 顧客ステータス基準の活動実績（架電ログが無い運用向け） */
export type StatusActivity = {
  total: number;
  leads: number; // 未着手（アプローチ前/未設定）
  contacted: number; // コンタクト済み（架電実績）
  appointments: number; // アポ獲得以降
  apptRate: number; // %
  byResult: Breakdown[]; // 架電結果の内訳
  byRep: StatusRep[]; // 担当者別
  apptMonthly: { key: string; label: string; appointments: number }[]; // アポ取得日の月次
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
  sRep: string | null; // S担当（成約営業）
  csRep: string | null; // 社内担当（CS）
  health: string | null; // 健全性スコア
  customerId: string | null; // 紐づく顧客ページID（IS担当の集計用）
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
  target: number; // 当月目標架電数（0=未設定）
  achievement: number | null; // 目標達成率 %（targetなしはnull）
};

/** 全社の目標達成サマリ */
export type TargetSummary = {
  totalTarget: number;
  totalCalls: number;
  achievement: number | null; // %
};

/** 目標と実績の組（達成率つき） */
export type Goal = { target: number; actual: number; achievement: number | null };

/** 各種目標の達成状況 */
export type Goals = {
  monthlyCalls: Goal; // 月次 架電（全社）
  monthlyAppointments: Goal; // 月次 アポ獲得（全社）
  monthlyContracts: Goal; // 月次 契約数（全社・採用SNS+人材紹介+その他）
  monthlyContractsSns: Goal; // 月次 契約数（採用SNS）
  monthlyContractsAgency: Goal; // 月次 契約数（人材紹介）
  dailyCalls: Goal; // 本日の架電（全社） vs 日次目標合計
};

/** 項目別内訳の集合（分析の土台。フィールドを足すだけで拡張可能） */
export type Breakdowns = {
  rank: Breakdown[]; // 見込み度合い
  industry: Breakdown[]; // 業種
  method: Breakdown[]; // 営業手法
  phase: Breakdown[]; // 企業フェーズ
  pref: Breakdown[]; // 都道府県
  isRep: Breakdown[]; // IS担当
};

/** ファネル段 */
export type FunnelStage = { stage: string; count: number; color: string };

/**
 * 本日の活動（架電数）。Notion手動架電（顧客ステータスを接触系へ更新）と
 * システム架電（📞架電記録の当日ログ）を統合した値。
 * calls は二重計上を避けるため max(ステータス更新ベース, ログベース) を採用する。
 */
export type TodayActivity = {
  calls: number; // 本日の架電数（統合・全社）
  appointments: number; // 本日のアポ獲得（アポ取得日が本日）
  statusCalls: number; // 参考: ステータス更新ベース（Notion架電）
  systemCalls: number; // 参考: 📞架電記録の当日ログ（システム架電）
  byRep: { rep: string; calls: number; appointments: number }[]; // 担当者別（非稼働メンバー除外）
};

/** ダッシュボード全体データ */
export type DashboardData = {
  generatedAt: string;
  metricsSince: string; // 実績集計の起点日（YYYY-MM-DD）
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
    newContractsSnsThisMonth: number; // 今月の新規契約（採用SNS）
    newContractsAgencyThisMonth: number; // 今月の新規契約（人材紹介）
  };
  weekly: SeriesPoint[];
  monthly: SeriesPoint[];
  reps: RepStat[];
  statusActivity: StatusActivity;
  today: TodayActivity; // 本日の架電・活動（Notion手動＋システム統合）
  targetSummary: TargetSummary;
  goals: Goals;
  funnel: FunnelStage[];
  statusBreakdown: { status: string; count: number }[];
  breakdowns: Breakdowns;
  workedCustomers: DrillCustomer[]; // 実績の内訳ドリルダウン用（着手済み・since以降）
  mrrTrend: { key: string; label: string; mrr: number; active: number }[];
};
