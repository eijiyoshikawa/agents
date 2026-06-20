// データソースの選択。
// Supabase の環境変数が揃っていれば Supabase、無ければ seed（静的）を使う。
// これによりクレデンシャル未設定でもビルド・開発が可能。
import type { DataSource } from "./source";
import { seedSource } from "./seed-source";
import { supabaseSource } from "./supabase-source";
import { hasServerSupabase } from "./supabase";

export function getDataSource(): DataSource {
  return hasServerSupabase() ? supabaseSource : seedSource;
}

export type { DataSource };
