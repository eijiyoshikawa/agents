export const ROLES = ["staff", "manager", "exec"] as const;
export type Role = (typeof ROLES)[number];

const RANK: Record<Role, number> = { staff: 0, manager: 1, exec: 2 };

export function isRole(v: unknown): v is Role {
  return typeof v === "string" && (ROLES as readonly string[]).includes(v);
}

/** role が minRole 以上か */
export function hasRole(role: Role, minRole: Role): boolean {
  return RANK[role] >= RANK[minRole];
}

export const ROLE_LABEL: Record<Role, string> = { exec: "役員", manager: "管理職", staff: "一般" };
