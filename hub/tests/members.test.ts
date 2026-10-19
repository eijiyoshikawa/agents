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
    expect(m).toEqual({ email: "someone@let-inc.net", name: "山田", role: "staff" });
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
    expect(list.find((d) => d.key === "sales")?.url).toContain("vercel.app");
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
