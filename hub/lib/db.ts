/** ハブのメンバー保存先 Postgres（HUB_DATABASE_URL、無ければ DATABASE_URL）。未設定なら config/members.json と env だけで動く。 */
import postgres, { type Sql } from "postgres";

let client: Sql | undefined;

export function hubDbUrl(): string | undefined {
  return process.env.HUB_DATABASE_URL || process.env.DATABASE_URL || undefined;
}
export function hubDbConfigured(): boolean {
  return Boolean(hubDbUrl());
}
export function sql(): Sql {
  const url = hubDbUrl();
  if (!url) throw new Error("HUB_DATABASE_URL が未設定です");
  if (!client) {
    client = postgres(url, { max: 3, idle_timeout: 20, connect_timeout: 10, prepare: false, onnotice: () => {}, ssl: /localhost|127\.0\.0\.1/.test(url) ? undefined : "require" });
  }
  return client;
}
