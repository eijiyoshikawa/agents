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
  /** 段階分け: 親サイト（例: hyoka）の一部。親にチェックがあれば含まれる */
  parent?: string;
};

type Raw = { key: string; title: string; desc: string; source: string; urlEnv: string; defaultUrl: string; minRole: string; sso: string; group?: string; parent?: string };

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
      ...(d.parent ? { parent: d.parent } : {}),
    }))
    .filter((d) => d.url !== "");
}

/** 全ダッシュボード（URL 未設定も含む。権限設定画面の候補用） */
export function allDashboardKeys(): { key: string; title: string; minRole: Role; parent?: string }[] {
  return (dashboardsJson.dashboards as Raw[]).filter((d) => isRole(d.minRole)).map((d) => ({ key: d.key, title: d.title, minRole: d.minRole as Role, ...(d.parent ? { parent: d.parent } : {}) }));
}

/** 役割に応じて閲覧可能なダッシュボードだけを返す */
export function dashboardsForRole(role: Role, env: NodeJS.ProcessEnv = process.env): Dashboard[] {
  return listDashboards(env).filter((d) => hasRole(role, d.minRole));
}

/**
 * メンバーごとにログインできるダッシュボード。
 * - allow が null: 役割で見られるものすべて（役員＝全部、管理職＝manager 以下、一般＝staff のみ）
 * - allow が配列: メンバー管理の「ログインできるサイト」でチェックしたものだけ（役割に関係なく、チェックが正）
 */
export function dashboardsForMember(role: Role, allow: string[] | null | undefined, env: NodeJS.ProcessEnv = process.env): Dashboard[] {
  // 段階分けの子（parent あり）は「すべて」のメンバーには出さない（親で全部見られる）
  if (!allow) return dashboardsForRole(role, env).filter((d) => !d.parent);
  const set = new Set(allow);
  // 親にもチェックがあるときは子を出さない（親で全部見られる）
  return listDashboards(env).filter((d) => set.has(d.key) && !(d.parent && set.has(d.parent)));
}
