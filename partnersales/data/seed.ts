// シードデータの集約エクスポート（事前準備フェーズ用）
// 実データは下記の各ファイルで管理する:
//   - data/services.ts … サービス定義と報酬率（★ 報酬率の追加・変更はここ）
//   - data/partners.ts … パートナーと紹介ツリー
//   - data/deals.ts    … クライアント契約（成約）
// 本番では各ファイルを Supabase テーブルに置き換える。
export { services, percentagePlan, fixedPlan, DEFAULT_TIER_RATES } from "./services";
export { partners } from "./partners";
export { deals } from "./deals";
export { payouts } from "./payouts";
