// Supabase クライアントの生成（環境変数でゲート）。
// 未設定でもアプリは seed データで動作する（lib/db/index.ts でフォールバック）。
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** ビルド時・サーバ側の読み取り（service_role があれば RLS をバイパス） */
export function hasServerSupabase(): boolean {
  return Boolean(url && (serviceRoleKey || anonKey));
}

/** ブラウザ（登録フォーム等）からの書き込み用設定が揃っているか */
export function hasBrowserSupabase(): boolean {
  return Boolean(url && anonKey);
}

/** サーバ側クライアント。service_role を優先し、無ければ anon を使う */
export function getServerClient(): SupabaseClient {
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL が未設定です");
  const key = serviceRoleKey || anonKey;
  if (!key) throw new Error("Supabase の API キーが未設定です");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** ブラウザ側クライアント（anon キー）。クライアントコンポーネントから使用 */
export function getBrowserClient(): SupabaseClient {
  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY が未設定です");
  }
  return createClient(url, anonKey, {
    auth: { persistSession: false },
  });
}
