// middleware.js の検証。実行: node scripts/test-middleware.mjs
import assert from "node:assert/strict";
import middleware, { verifyHubSession, isCustomDomain, isExecPath } from "../middleware.js";

const enc = new TextEncoder();
const b64url = (buf) => Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
async function sign(payload, secret) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const body = b64url(enc.encode(JSON.stringify(payload)));
  const sig = b64url(await crypto.subtle.sign("HMAC", key, enc.encode(body)));
  return `${body}.${sig}`;
}
const now = Math.floor(Date.now() / 1000);
const SECRET = "test-secret";
const session = (role, extra = {}) => sign({ v: 1, email: `${role}@example.com`, name: role, role, iat: now, exp: now + 3600, ...extra }, SECRET);
const req = (path, { host = "hyoka.let-inc.net", cookie } = {}) =>
  new Request(`https://${host}${path}`, { headers: { host, ...(cookie ? { cookie } : {}) } });

process.env.HUB_SESSION_SECRET = SECRET;
process.env.HUB_URL = "https://hub.example.test/";
process.env.HYOKA_EXEC_PASSWORD = "p@ss word";
delete process.env.HYOKA_PROTECT;

// 純粋関数
assert.equal(isCustomDomain("hyoka.let-inc.net"), true);
assert.equal(isCustomDomain("let-hyoka.vercel.app"), false);
assert.equal(isCustomDomain("localhost:3000"), false);
assert.equal(isExecPath("/"), true);
assert.equal(isExecPath("/marketing/v2"), true);
assert.equal(isExecPath("/demo/sales"), false);
assert.equal(isExecPath("/assets/hub-link.js"), false);
assert.equal(await verifyHubSession(await session("exec"), SECRET).then((s) => s?.role), "exec");
assert.equal(await verifyHubSession(await session("exec"), "wrong"), null);
assert.equal(await verifyHubSession(await session("exec", { exp: now - 1 }), SECRET), null);
assert.equal(await verifyHubSession("garbage", SECRET), null);

// *.vercel.app は素通し
let res = await middleware(req("/", { host: "let-hyoka.vercel.app" }));
assert.equal(res.headers.get("x-middleware-next"), "1");
assert.equal(res.headers.get("set-cookie"), null);

// 独自ドメイン・未ログイン → ハブのログインへ
res = await middleware(req("/"));
assert.equal(res.status, 302);
assert.equal(res.headers.get("location"), "https://hub.example.test/login");

// 不正な Cookie → ログインへ
res = await middleware(req("/", { cookie: "let_hub=abc.def" }));
assert.equal(res.status, 302);

// 役員 → 通過 + 解錠 Cookie
res = await middleware(req("/sales", { cookie: `let_hub=${await session("exec")}` }));
assert.equal(res.headers.get("x-middleware-next"), "1");
assert.match(res.headers.get("set-cookie"), /^let_hyoka_unlock=p%40ss%20word; Path=\/; Max-Age=\d+; Secure; SameSite=Lax$/);

// 役員・従業員ページ → 通過、解錠 Cookie なし
res = await middleware(req("/demo/sales", { cookie: `let_hub=${await session("exec")}` }));
assert.equal(res.headers.get("x-middleware-next"), "1");
assert.equal(res.headers.get("set-cookie"), null);

// 管理職 → 経営陣ページは 403、従業員ページは通過
res = await middleware(req("/", { cookie: `let_hub=${await session("manager")}` }));
assert.equal(res.status, 403);
res = await middleware(req("/my/ehara", { cookie: `let_hub=${await session("manager")}` }));
assert.equal(res.headers.get("x-middleware-next"), "1");

// 解錠パスワード未設定 → Cookie なしで通過
delete process.env.HYOKA_EXEC_PASSWORD;
res = await middleware(req("/", { cookie: `let_hub=${await session("exec")}` }));
assert.equal(res.headers.get("set-cookie"), null);

// HYOKA_PROTECT=1 なら *.vercel.app でも必須
process.env.HYOKA_PROTECT = "1";
res = await middleware(req("/", { host: "let-hyoka.vercel.app" }));
assert.equal(res.status, 302);
delete process.env.HYOKA_PROTECT;

// 鍵なし → 503（独自ドメインで素通しにしない）
delete process.env.HUB_SESSION_SECRET;
res = await middleware(req("/"));
assert.equal(res.status, 503);

console.log("middleware tests: OK");
