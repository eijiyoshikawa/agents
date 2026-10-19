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
};

type Raw = { key: string; title: string; desc: string; source: string; urlEnv: string; defaultUrl: string; minRole: string; sso: string };

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
    }))
    .filter((d) => d.url !== "");
}

/** 役割に応じて閲覧可能なダッシュボードだけを返す */
export function dashboardsForRole(role: Role, env: NodeJS.ProcessEnv = process.env): Dashboard[] {
  return listDashboards(env).filter((d) => hasRole(role, d.minRole));
}
