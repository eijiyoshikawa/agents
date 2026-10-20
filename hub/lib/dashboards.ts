import dashboardsJson from "@/config/dashboards.json";
import { hasRole, isRole, type Role } from "./roles";

export type SsoStatus = "ready" | "planned" | "link-only";
export type Dashboard = {
  key: string;
  title: string;
  desc: string;
  source: string;
  url: string;
  minRole: Role;
  sso: SsoStatus;
  group: string;
};

type Raw = { key: string; title: string; desc: string; source: string; urlEnv: string; defaultUrl: string; minRole: string; sso: string; group?: string };

function resolveUrl(d: Raw, env: NodeJS.ProcessEnv): string {
  const fromEnv = (env[d.urlEnv] ?? "").trim();
  return fromEnv || d.defaultUrl;
}

/** 設定済み（URL あり）のダッシュボード一覧 */
export function listDashboards(env: NodeJS.ProcessEnv = process.env): Dashboard[] {
  return (dashboardsJson.dashboards as Raw[])
    .filter((d) => isRole(d.minRole))
    .map((d) => ({
      key: d.key,
      title: d.title,
      desc: d.desc,
      source: d.source,
      url: resolveUrl(d, env),
      minRole: d.minRole as Role,
      sso: (["ready", "planned", "link-only"].includes(d.sso) ? d.sso : "link-only") as SsoStatus,
      group: (d.group ?? "").trim() || "その他",
    }))
    .filter((d) => d.url !== "");
}

/** 全ダッシュボード（URL 未設定も含む。権限設定画面の候補用） */
export function allDashboardKeys(): { key: string; title: string; minRole: Role }[] {
  return (dashboardsJson.dashboards as Raw[]).filter((d) => isRole(d.minRole)).map((d) => ({ key: d.key, title: d.title, minRole: d.minRole as Role }));
}

/** 役割に応じて閲覧可能なダッシュボードだけを返す */
export function dashboardsForRole(role: Role, env: NodeJS.ProcessEnv = process.env): Dashboard[] {
  return listDashboards(env).filter((d) => hasRole(role, d.minRole));
}

/**
 * メンバーごとの閲覧可能ダッシュボード。
 * 役割で見られるものの中から、allow が指定されていればそのキーだけに絞る（項目単位の制限）。
 */
export function dashboardsForMember(role: Role, allow: string[] | null | undefined, env: NodeJS.ProcessEnv = process.env): Dashboard[] {
  const base = dashboardsForRole(role, env);
  if (!allow) return base;
  const set = new Set(allow);
  return base.filter((d) => set.has(d.key));
}
