// middleware.js の検証。実行: node scripts/test-middleware.mjs
import assert from "node:assert/strict";
import middleware, { verifyHubSession, isCustomDomain, isExecPath, deptOfPath, accessFor } from "../middleware.js";

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
process.env.HYOKA_PASSWORD_MARKETING = "mk-pass";
delete process.env.HYOKA_PASSWORD_SALES;
delete process.env.HYOKA_PROTECT;

// 純粋関数
assert.equal(isCustomDomain("hyoka.let-inc.net"), true);
assert.equal(isCustomDomain("let-hyoka.vercel.app"), false);
assert.equal(isCustomDomain("localhost:3000"), false);
assert.equal(isExecPath("/"), true);
assert.equal(isExecPath("/marketing/v2"), false); // マーケ部用の従業員ページ扱い
assert.equal(deptOfPath("/marketing/v2")?.id, "marketing");
assert.equal(deptOfPath("/demo/sales.html")?.id, "sales");
assert.equal(deptOfPath("/manual/bpo/")?.id, "bpo");
assert.equal(deptOfPath("/new-system"), null);
assert.deepEqual(accessFor({ role: "exec" }).full, true);
assert.deepEqual(accessFor({ role: "staff" }).depts.length, 3);
assert.deepEqual(accessFor({ role: "exec", apps: ["hyoka_sales"] }), { full: false, depts: [accessFor({ role: "exec" }).depts[0]], none: false });
assert.equal(accessFor({ role: "staff", apps: ["hyoka"] }).full, true);
assert.equal(accessFor({ role: "exec", apps: ["sales"] }).none, true);
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

// 「ログインできるサイト」に評価制度サイト（どの段階も）が無いメンバー → 403（役員でも）
res = await middleware(req("/demo/sales", { cookie: `let_hub=${await session("exec", { apps: ["sales", "kpi"] })}` }));
assert.equal(res.status, 403);
// 役員・全部門（hyoka）を含むメンバー → 一般でも経営陣ページまで通過（解錠 Cookie 付き）
res = await middleware(req("/sales", { cookie: `let_hub=${await session("staff", { apps: ["hyoka"] })}` }));
assert.equal(res.headers.get("x-middleware-next"), "1");
assert.match(res.headers.get("set-cookie"), /^let_hyoka_unlock=p%40ss%20word;/);

// 部門の段階: セールスだけのメンバー
const salesOnly = `let_hub=${await session("staff", { apps: ["hyoka_sales"] })}`;
res = await middleware(req("/demo/sales", { cookie: salesOnly }));
assert.equal(res.headers.get("x-middleware-next"), "1");
assert.equal(res.headers.get("set-cookie"), null); // HYOKA_PASSWORD_SALES 未設定なので解錠 Cookie なし
res = await middleware(req("/manual/sales", { cookie: salesOnly }));
assert.equal(res.headers.get("x-middleware-next"), "1");
res = await middleware(req("/demo/marketing", { cookie: salesOnly })); // 他部門 → 403
assert.equal(res.status, 403);
res = await middleware(req("/marketing/v2", { cookie: salesOnly }));
assert.equal(res.status, 403);
res = await middleware(req("/sales", { cookie: salesOnly })); // 経営陣ページ → 403
assert.equal(res.status, 403);
res = await middleware(req("/new-system", { cookie: salesOnly })); // 共通ページ → 通過
assert.equal(res.headers.get("x-middleware-next"), "1");
res = await middleware(req("/my/ehara", { cookie: salesOnly }));
assert.equal(res.headers.get("x-middleware-next"), "1");
res = await middleware(req("/", { cookie: salesOnly })); // トップ → 1 部門だけなのでその入口へ転送
assert.equal(res.status, 302);
assert.equal(res.headers.get("location"), "https://hyoka.let-inc.net/demo/sales");

// マーケティングの段階: /marketing/v2 も見られ、部門パスワードが設定されていれば解錠 Cookie が付く
const mk = `let_hub=${await session("staff", { apps: ["hyoka_marketing"] })}`;
res = await middleware(req("/marketing/v2", { cookie: mk }));
assert.equal(res.headers.get("x-middleware-next"), "1");
assert.match(res.headers.get("set-cookie"), /^let_hyoka_unlock=mk-pass;/);
res = await middleware(req("/demo/marketing", { cookie: mk }));
assert.match(res.headers.get("set-cookie"), /^let_hyoka_unlock=mk-pass;/);
res = await middleware(req("/marketing", { cookie: mk })); // 経営陣のマーケページは 403
assert.equal(res.status, 403);

// 2 部門のメンバーがトップを開く → 部門を選ぶ画面（200）
const two = `let_hub=${await session("manager", { apps: ["hyoka_sales", "hyoka_bpo"] })}`;
res = await middleware(req("/", { cookie: two }));
assert.equal(res.status, 200);
const body = await res.text();
assert.match(body, /\/demo\/sales/);
assert.match(body, /\/demo\/bpo/);
assert.doesNotMatch(body, /\/demo\/marketing/);

// 役員（hyoka）が /marketing/v2 を開くと経営陣パスワードで解錠
res = await middleware(req("/marketing/v2", { cookie: `let_hub=${await session("staff", { apps: ["hyoka"] })}` }));
assert.match(res.headers.get("set-cookie"), /^let_hyoka_unlock=p%40ss%20word;/);
// apps が配列でない改ざんは拒否
res = await middleware(req("/demo/sales", { cookie: `let_hub=${await session("staff", { apps: "hyoka" })}` }));
assert.equal(res.status, 302);

// 役員・従業員ページ → 通過、解錠 Cookie なし
res = await middleware(req("/demo/sales", { cookie: `let_hub=${await session("exec")}` }));
assert.equal(res.headers.get("x-middleware-next"), "1");
assert.equal(res.headers.get("set-cookie"), null);

// 「すべてのサイト」の管理職（apps なし） → 経営陣ページは 403、従業員ページは全部門通過、トップは部門を選ぶ画面
res = await middleware(req("/sales", { cookie: `let_hub=${await session("manager")}` }));
assert.equal(res.status, 403);
res = await middleware(req("/", { cookie: `let_hub=${await session("manager")}` }));
assert.equal(res.status, 200);
res = await middleware(req("/my/ehara", { cookie: `let_hub=${await session("manager")}` }));
assert.equal(res.headers.get("x-middleware-next"), "1");
res = await middleware(req("/demo/marketing", { cookie: `let_hub=${await session("staff")}` }));
assert.equal(res.headers.get("x-middleware-next"), "1");
assert.match(res.headers.get("set-cookie"), /^let_hyoka_unlock=mk-pass;/);

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
