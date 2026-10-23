import { describe, expect, it } from "vitest";
import { resolveMember } from "@/lib/members";
import { dashboardsForRole, listDashboards } from "@/lib/dashboards";
import { hasRole } from "@/lib/roles";

describe("メンバー解決", () => {
  it("members.json に一致すればその役割（大文字小文字・空白を無視）", () => {
    const m = resolveMember("  EiYoshi99@gmail.com ", null, "");
    expect(m?.role).toBe("exec");
  });
  it("許可ドメインのアカウントは staff", () => {
    const m = resolveMember("someone@let-inc.net", "山田", "let-inc.net");
    expect(m).toMatchObject({ email: "someone@let-inc.net", name: "山田", role: "staff" });
    expect(resolveMember("someone@let-inc.net", null, "@let-inc.net")?.name).toBe("someone");
  });
  it("未登録かつ許可ドメイン外は拒否", () => {
    expect(resolveMember("x@example.com", "X", "let-inc.net")).toBeNull();
    expect(resolveMember("x@example.com", "X", "")).toBeNull();
    expect(resolveMember("not-an-email", "X", "let-inc.net")).toBeNull();
  });
});

describe("ダッシュボード一覧", () => {
  const env = { HUB_URL_CONSOLE: "" } as unknown as NodeJS.ProcessEnv;
  it("URL が空のものは除外され、env があれば優先される", () => {
    const list = listDashboards({ ...env, HUB_URL_FINANCE: "https://finance.let-inc.net" });
    expect(list.find((d) => d.key === "console")).toBeUndefined();
    expect(list.find((d) => d.key === "finance")?.url).toBe("https://finance.let-inc.net");
    expect(list.find((d) => d.key === "sales")?.url).toMatch(/^https:\/\//);
  });
  it("役割で絞り込まれる（staff は exec 専用を見られない）", () => {
    const keys = (r: "staff" | "manager" | "exec") => dashboardsForRole(r, env).map((d) => d.key);
    expect(keys("staff")).not.toContain("finance");
    expect(keys("manager")).toContain("sales");
    expect(keys("manager")).not.toContain("finance");
    expect(keys("exec")).toEqual(expect.arrayContaining(["finance", "sales", "jinji", "kpi", "hyoka"]));
    expect(hasRole("exec", "staff")).toBe(true);
  });
});

describe("safeNext", () => {
  it("サイト内パスのみ許可", async () => {
    const { safeNext } = await import("@/lib/safe-next");
    expect(safeNext("/finance")).toBe("/finance");
    expect(safeNext("//evil.com")).toBe("/");
    expect(safeNext("https://evil.com")).toBe("/");
    expect(safeNext(undefined)).toBe("/");
  });
});

describe("メンバーごとの項目制限", () => {
  it("allow が null なら役割で見られる全サイト、配列なら「ログインできるサイト」のチェックが正（役割に関係なく）", async () => {
    const { dashboardsForMember } = await import("@/lib/dashboards");
    const env = { HUB_URL_CONSOLE: "" } as unknown as NodeJS.ProcessEnv;
    expect(dashboardsForMember("manager", null, env).map((d) => d.key)).toContain("sales");
    expect(dashboardsForMember("manager", null, env).map((d) => d.key)).not.toContain("finance");
    expect(dashboardsForMember("manager", ["sales"], env).map((d) => d.key)).toEqual(["sales"]);
    expect(dashboardsForMember("staff", ["finance", "ops"], env).map((d) => d.key)).toEqual(["finance", "ops"]);
    expect(dashboardsForMember("staff", [], env)).toEqual([]);
  });
  it("評価制度サイトの段階（親子）: 「すべて」には親だけ、親にチェックがあれば子は出さない、子だけなら子が出る", async () => {
    const { dashboardsForMember, allDashboardKeys } = await import("@/lib/dashboards");
    const env = { HUB_URL_CONSOLE: "" } as unknown as NodeJS.ProcessEnv;
    const execAll = dashboardsForMember("exec", null, env).map((d) => d.key);
    expect(execAll).toContain("hyoka");
    expect(execAll).not.toContain("hyoka_marketing");
    expect(dashboardsForMember("staff", ["hyoka", "hyoka_sales"], env).map((d) => d.key)).toEqual(["hyoka"]);
    expect(dashboardsForMember("staff", ["hyoka_marketing", "hyoka_bpo"], env).map((d) => d.key)).toEqual(["hyoka_marketing", "hyoka_bpo"]);
    expect(dashboardsForMember("staff", ["hyoka_sales"], env)[0]?.url).toBe("https://hyoka.let-inc.net/demo/sales");
    expect(allDashboardKeys().filter((d) => d.parent === "hyoka").map((d) => d.key)).toEqual(["hyoka_marketing", "hyoka_sales", "hyoka_bpo"]);
  });
  it("初期パスワード生成", async () => {
    const { generatePassword } = await import("@/lib/password");
    const p = generatePassword();
    expect(p).toHaveLength(12);
    expect(/^[A-Za-z0-9]+$/.test(p)).toBe(true);
    expect(generatePassword()).not.toBe(p);
  });
});
