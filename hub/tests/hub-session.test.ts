import { describe, expect, it } from "vitest";
import { buildSession, hubAllows, hubCookieOptions, signHubSession, verifyHubSession } from "@/lib/hub-session";
import { hubAllows as edgeAllows, verifyHubSession as verifyEdge } from "@/shared/verify-hub-session.edge";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const nodeVerifier = require("../shared/verify-hub-session.js") as typeof import("../shared/verify-hub-session.js");

const SECRET = "test-secret";
const NOW = 1_800_000_000;

describe("hub session 署名・検証", () => {
  it("署名したトークンを TS / Edge / Node の 3 実装すべてが同じ内容に復元する", async () => {
    const s = buildSession({ email: "a@example.com", name: "A", role: "exec" }, NOW, 3600);
    const token = await signHubSession(s, SECRET);
    expect(await verifyHubSession(token, SECRET, NOW + 10)).toEqual(s);
    expect(await verifyEdge(token, SECRET, NOW + 10)).toEqual(s);
    expect(nodeVerifier.verifyHubSession(token, SECRET, NOW + 10)).toEqual(s);
  });

  it("ログインできるサイト（apps）を含めて署名・復元でき、判定は 3 実装で一致する", async () => {
    const s = buildSession({ email: "b@example.com", name: "B", role: "staff", apps: ["ops", "jinji"] }, NOW, 3600);
    expect(s.apps).toEqual(["ops", "jinji"]);
    const token = await signHubSession(s, SECRET);
    const ts = await verifyHubSession(token, SECRET, NOW + 10);
    const edge = await verifyEdge(token, SECRET, NOW + 10);
    const node = nodeVerifier.verifyHubSession(token, SECRET, NOW + 10);
    expect(ts).toEqual(s);
    expect(edge).toEqual(s);
    expect(node).toEqual(s);
    // apps があれば役割に関係なくその一覧で判定（staff でも finance を許可できる／exec でも外せる）
    expect(hubAllows(ts!, "ops", "staff")).toBe(true);
    expect(hubAllows(ts!, "finance", "exec")).toBe(false);
    expect(edgeAllows(edge!, "jinji", "manager")).toBe(true);
    expect(nodeVerifier.hubAllows(node, "kpi", "staff")).toBe(false);
    const execAll = buildSession({ email: "c@example.com", name: "C", role: "exec", apps: ["sales"] }, NOW, 3600);
    expect(hubAllows(execAll, "finance", "exec")).toBe(false);
    // apps が無ければ従来どおり役割で判定
    const byRole = buildSession({ email: "d@example.com", name: "D", role: "manager", apps: null }, NOW, 3600);
    expect(byRole.apps).toBeUndefined();
    expect(hubAllows(byRole, "finance", "exec")).toBe(false);
    expect(hubAllows(byRole, "sales", "manager")).toBe(true);
    expect(nodeVerifier.hubAllows(byRole, "sales", "manager")).toBe(true);
    // apps が配列でない改ざんは拒否
    const bad = await signHubSession({ ...s, apps: "ops" as never }, SECRET);
    expect(await verifyHubSession(bad, SECRET, NOW)).toBeNull();
    expect(await verifyEdge(bad, SECRET, NOW)).toBeNull();
    expect(nodeVerifier.verifyHubSession(bad, SECRET, NOW)).toBeNull();
  });

  it("秘密鍵が違えば全実装で拒否する", async () => {
    const token = await signHubSession(buildSession({ email: "a@example.com", name: "A", role: "staff" }, NOW, 3600), SECRET);
    expect(await verifyHubSession(token, "other", NOW)).toBeNull();
    expect(await verifyEdge(token, "other", NOW)).toBeNull();
    expect(nodeVerifier.verifyHubSession(token, "other", NOW)).toBeNull();
  });

  it("失効後は拒否する", async () => {
    const token = await signHubSession(buildSession({ email: "a@example.com", name: "A", role: "staff" }, NOW, 60), SECRET);
    expect(await verifyHubSession(token, SECRET, NOW + 61)).toBeNull();
    expect(nodeVerifier.verifyHubSession(token, SECRET, NOW + 61)).toBeNull();
  });

  it("ペイロード改ざん・不正形式・不明な役割は拒否する", async () => {
    const token = await signHubSession(buildSession({ email: "a@example.com", name: "A", role: "staff" }, NOW, 3600), SECRET);
    const [payload, sig] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(payload, "base64url").toString()), role: "exec" })).toString("base64url");
    expect(await verifyHubSession(`${forged}.${sig}`, SECRET, NOW)).toBeNull();
    expect(nodeVerifier.verifyHubSession(`${forged}.${sig}`, SECRET, NOW)).toBeNull();
    expect(await verifyHubSession("garbage", SECRET, NOW)).toBeNull();
    expect(await verifyHubSession(undefined, SECRET, NOW)).toBeNull();
    const bad = await signHubSession({ ...buildSession({ email: "a@example.com", name: "A", role: "staff" }, NOW, 3600), role: "root" as never }, SECRET);
    expect(await verifyHubSession(bad, SECRET, NOW)).toBeNull();
  });

  it("Cookie 属性: HUB_COOKIE_DOMAIN があれば親ドメインに共有、本番は Secure", () => {
    expect(hubCookieOptions({ HUB_COOKIE_DOMAIN: ".let-inc.net", NODE_ENV: "production" } as unknown as NodeJS.ProcessEnv)).toMatchObject({
      domain: ".let-inc.net",
      secure: true,
      httpOnly: true,
      sameSite: "lax",
    });
    expect(hubCookieOptions({ NODE_ENV: "development" } as unknown as NodeJS.ProcessEnv)).not.toHaveProperty("domain");
  });

  it("Node 版 parseCookie は let_hub を取り出せる", () => {
    const c = nodeVerifier.parseCookie("foo=1; let_hub=abc.def; bar=x%20y");
    expect(c.let_hub).toBe("abc.def");
    expect(c.bar).toBe("x y");
    expect(nodeVerifier.hasRole("exec", "manager")).toBe(true);
    expect(nodeVerifier.hasRole("staff", "manager")).toBe(false);
  });
});
