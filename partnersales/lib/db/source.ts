// 読み取り用データソースの抽象。
// ビルド時／サーバ側でサービス・パートナー・成約を取得する。
// seed（静的）と Supabase の2実装を切り替えられる（lib/db/index.ts）。
import type { Deal, Partner, Payout, RatePlan, Service } from "@/lib/types";

export interface DataSource {
  /** データソース名（デバッグ表示用） */
  readonly name: string;
  getServices(): Promise<Service[]>;
  getPartners(): Promise<Partner[]>;
  getDeals(): Promise<Deal[]>;
  getPayouts(): Promise<Payout[]>;
  getRatePlans(): Promise<RatePlan[]>;
}
