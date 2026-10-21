import { describe, expect, it } from "vitest";
import { buildSession, hubCookieOptions, signHubSession, verifyHubSession } from "@/lib/hub-session";
import { verifyHubSession as verifyEdge } from "@/shared/verify-hub-session.edge";
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
