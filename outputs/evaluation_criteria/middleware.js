/**
 * 評価制度サイトの Edge Middleware（Vercel・フレームワークなし）。
 *
 * 独自ドメイン（hyoka.let-inc.net）では経営ハブ（hub.let-inc.net）の共通ログイン
 * Cookie `let_hub` を検証し、未ログインならハブのログイン画面へ送る。
 *
 * 見られる範囲は 4 段階（ハブのメンバー管理「ログインできるサイト」のチェックで決まる）:
 *   - 役員・全部門（key: hyoka）        … すべて。経営陣ページ（/ /sales /marketing /bpo）を含む
 *   - マーケティング（key: hyoka_marketing）… /demo/marketing /manual/marketing /marketing/v2 と共通ページ
 *   - セールス（key: hyoka_sales）      … /demo/sales /manual/sales と共通ページ
 *   - 不動産BPO（key: hyoka_bpo）       … /demo/bpo /manual/bpo と共通ページ
 *   共通ページ = /new-system /manual /my/*（と assets・data）。
 *   サイトを個別に選んでいないメンバー（Cookie に apps なし）は従来どおり: 役員は全部、それ以外は従業員ページ全部門。
 *   トップ（/）は役員以外には部門の入口ページを案内する（1 部門だけならそこへ転送）。
 *
 * 解錠: 役員には HYOKA_EXEC_PASSWORD、部門ページには HYOKA_PASSWORD_SALES / _MARKETING / _BPO（任意）を
 *   解錠用 Cookie で渡し、assets/hub-unlock.js がページのパスワード入力を自動で済ませる（データは従来どおりパスワードで暗号化）。
 * *.vercel.app（let-hyoka.vercel.app）では何もしない（従来の JS パスワードのまま）。
 *
 * 環境変数:
 *   HUB_SESSION_SECRET  let_hub の署名鍵（ハブと同じ値。無いと独自ドメインでは 503）
 *   HUB_URL             ハブの URL（既定 https://hub.let-inc.net）
 *   HYOKA_EXEC_PASSWORD 経営陣ページのパスワード（任意。設定すると役員は自動解錠）
 *   HYOKA_PASSWORD_SALES / HYOKA_PASSWORD_MARKETING / HYOKA_PASSWORD_BPO
 *                       各部門の従業員用パスワード（任意。設定するとその部門のページで自動解錠）
 *   HYOKA_PROTECT       "1" で *.vercel.app でも共通ログインを必須にする（検証用）
 *
 * 検証: node scripts/test-middleware.mjs
 */
const HUB_COOKIE = "let_hub";
export const UNLOCK_COOKIE = "let_hyoka_unlock";
const ROLES = ["staff", "manager", "exec"];
const EXEC_PATHS = new Set([
  "/", "/index.html",
  "/sales", "/sales.html",
  "/marketing", "/marketing.html",
  "/bpo", "/bpo.html",
]);

/** 部門ごとの従業員用ページ。key はハブ dashboards.json の key、passwordEnv は自動解錠用の環境変数名 */
export const DEPTS = [
  { id: "sales", key: "hyoka_sales", label: "セールス（営業部）", home: "/demo/sales", paths: ["/demo/sales", "/manual/sales"], passwordEnv: "HYOKA_PASSWORD_SALES" },
  { id: "marketing", key: "hyoka_marketing", label: "マーケティング部", home: "/demo/marketing", paths: ["/demo/marketing", "/manual/marketing", "/marketing/v2"], passwordEnv: "HYOKA_PASSWORD_MARKETING" },
  { id: "bpo", key: "hyoka_bpo", label: "不動産BPO事業部", home: "/demo/bpo", paths: ["/demo/bpo", "/manual/bpo"], passwordEnv: "HYOKA_PASSWORD_BPO" },
];
const FULL_KEY = "hyoka";
const enc = new TextEncoder();

function b64urlDecode(str) {
  const bin = atob(str.replace(/-/g, "+").replace(/_/g, "/"));
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

/** hub/lib/hub-session.ts と同じ形式（payload.signature、HMAC-SHA256、base64url）を検証する */
export async function verifyHubSession(token, secret, now = Math.floor(Date.now() / 1000)) {
  if (!token || !secret) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  try {
    const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const ok = await crypto.subtle.verify("HMAC", key, b64urlDecode(sig), enc.encode(payload));
    if (!ok) return null;
    const s = JSON.parse(new TextDecoder().decode(b64urlDecode(payload)));
    if (s.v !== 1 || typeof s.email !== "string" || typeof s.exp !== "number" || !ROLES.includes(s.role)) return null;
    if (s.apps !== undefined && (!Array.isArray(s.apps) || !s.apps.every((a) => typeof a === "string"))) return null;
    if (s.exp <= now) return null;
    return s;
  } catch {
    return null;
  }
}

function getCookie(req, name) {
  const header = req.headers.get("cookie") || "";
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return null;
}

/** 独自ドメイン（*.vercel.app / localhost 以外）か */
export function isCustomDomain(host) {
  const h = (host || "").toLowerCase().split(":")[0];
  return h !== "" && !h.endsWith(".vercel.app") && h !== "localhost" && !h.startsWith("127.");
}

export function isExecPath(pathname) {
  return EXEC_PATHS.has(pathname.replace(/\/+$/, "") || "/");
}

/** パスを比較用に正規化（末尾スラッシュと .html を落とす） */
function normalizePath(pathname) {
  return (pathname.replace(/\/+$/, "").replace(/\.html$/, "") || "/");
}

/** そのパスがどの部門の従業員ページか（該当なしは null） */
export function deptOfPath(pathname) {
  const p = normalizePath(pathname);
  return DEPTS.find((d) => d.paths.includes(p)) ?? null;
}

/**
 * ハブのセッションから、このサイトで見られる範囲を決める。
 *   full  … 役員・全部門（経営陣ページを含むすべて）
 *   depts … 見られる部門（従業員ページ）
 *   none  … 何も見られない（「ログインできるサイト」に評価制度サイトが無い）
 */
export function accessFor(hub) {
  if (Array.isArray(hub.apps)) {
    const full = hub.apps.includes(FULL_KEY);
    const depts = full ? DEPTS : DEPTS.filter((d) => hub.apps.includes(d.key));
    return { full, depts, none: !full && depts.length === 0 };
  }
  // サイトを個別に選んでいないメンバー: 役員は全部、それ以外は従業員ページ全部門（従来どおり）
  return { full: hub.role === "exec", depts: DEPTS, none: false };
}

/** そのまま配信する（@vercel/edge の next() と同じ仕組み） */
function next(headers) {
  const h = new Headers(headers || {});
  h.set("x-middleware-next", "1");
  return new Response(null, { headers: h });
}

function htmlResponse(status, title, body) {
  const html = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>${title}</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b1a3a;color:#e6ecf7;font:15px/1.7 -apple-system,BlinkMacSystemFont,'Hiragino Sans','Noto Sans JP',sans-serif}
main{max-width:460px;padding:32px;border:1px solid rgba(150,172,225,.3);border-radius:14px;background:rgba(8,21,48,.9)}h1{font-size:18px;margin:0 0 12px}a{color:#86b4ff}</style></head>
<body><main><h1>${title}</h1><p>${body}</p></main></body></html>`;
  return new Response(html, { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

/** 役員以外がトップ（/）を開いたとき: 見られる部門の入口を案内する */
function chooserResponse(depts, hubUrl, who) {
  const items = depts.map((d) => `<li><a href="${d.home}">${escapeHtml(d.label)} の評価制度ページ →</a></li>`).join("");
  const html = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>評価制度サイト — 部門を選ぶ</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b1a3a;color:#e6ecf7;font:15px/1.7 -apple-system,BlinkMacSystemFont,'Hiragino Sans','Noto Sans JP',sans-serif}
main{max-width:480px;padding:32px;border:1px solid rgba(150,172,225,.3);border-radius:14px;background:rgba(8,21,48,.9)}h1{font-size:18px;margin:0 0 8px}p{margin:0 0 14px;color:#aeb9d6;font-size:13px}
ul{list-style:none;margin:0;padding:0;display:grid;gap:8px}li a{display:block;padding:12px 14px;border:1px solid rgba(150,172,225,.3);border-radius:10px;color:#e6ecf7;text-decoration:none;background:rgba(14,29,64,.9)}li a:hover{border-color:#86b4ff}
.back{display:block;margin-top:16px;font-size:12px;color:#86b4ff}</style></head>
<body><main><h1>評価制度サイト</h1><p>ログイン中: ${escapeHtml(who)}。見られる部門のページを選んでください。</p><ul>${items}</ul><a class="back" href="${hubUrl}">← 経営ハブへ戻る</a></main></body></html>`;
  return new Response(html, { status: 200, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

/** 解錠用 Cookie を付けて配信する */
function unlockWith(password, hub) {
  const maxAge = Math.max(60, hub.exp - Math.floor(Date.now() / 1000));
  const cookie = `${UNLOCK_COOKIE}=${encodeURIComponent(password)}; Path=/; Max-Age=${maxAge}; Secure; SameSite=Lax`;
  return next({ "set-cookie": cookie });
}

export default async function middleware(req) {
  const env = typeof process !== "undefined" && process.env ? process.env : {};
  const url = new URL(req.url);
  const host = req.headers.get("host") || url.host;
  const protect = env.HYOKA_PROTECT === "1" || isCustomDomain(host);
  if (!protect) return next();

  const hubUrl = (env.HUB_URL || "https://hub.let-inc.net").replace(/\/$/, "");
  const secret = env.HUB_SESSION_SECRET;
  if (!secret) {
    return htmlResponse(503, "共通ログインが未設定です", `このドメインでは経営ハブの共通ログインが必要ですが、鍵（HUB_SESSION_SECRET）が設定されていません。<a href="${hubUrl}">経営ハブ</a>`);
  }

  const hub = await verifyHubSession(getCookie(req, HUB_COOKIE), secret);
  if (!hub) {
    return Response.redirect(`${hubUrl}/login`, 302);
  }
  const who = escapeHtml(hub.name || hub.email);
  const access = accessFor(hub);

  // 「ログインできるサイト」に評価制度サイト（いずれの段階も）が無いメンバー
  if (access.none) {
    return htmlResponse(403, "このサイトへのログイン権限がありません", `評価制度サイトは「ログインできるサイト」に含まれていません（ログイン中: ${who}）。役員に経営ハブのメンバー管理で付与を依頼してください。<a href="${hubUrl}">経営ハブへ戻る</a>`);
  }

  const path = normalizePath(url.pathname);
  const execPage = isExecPath(path);

  // 役員以外のトップ: 部門の入口を案内（1 部門だけならそこへ）
  if (path === "/" && !access.full) {
    if (access.depts.length === 1) return Response.redirect(`${url.origin}${access.depts[0].home}`, 302);
    return chooserResponse(access.depts, hubUrl, hub.name || hub.email);
  }

  if (execPage && !access.full) {
    return htmlResponse(403, "役員専用ページです", `このページは役員（評価制度サイト・全部門）のみ閲覧できます（ログイン中: ${who}）。<a href="${hubUrl}">経営ハブへ戻る</a>`);
  }

  // 部門の従業員ページ: その部門が見られるメンバーだけ
  const dept = deptOfPath(path);
  if (dept && !access.full && !access.depts.includes(dept)) {
    const mine = access.depts.map((d) => `<a href="${d.home}">${escapeHtml(d.label)}</a>`).join("・");
    return htmlResponse(403, "この部門のページは閲覧できません", `${escapeHtml(dept.label)} のページは「ログインできるサイト」に含まれていません（ログイン中: ${who}）。見られる部門: ${mine || "なし"}。<a href="${hubUrl}">経営ハブへ戻る</a>`);
  }

  // 解錠用 Cookie（JS から読めるよう HttpOnly なし。ハブのセッション期限まで）
  if (execPage && access.full && env.HYOKA_EXEC_PASSWORD) return unlockWith(env.HYOKA_EXEC_PASSWORD, hub);
  if (dept) {
    // /marketing/v2 は経営陣パスワードでも開ける。役員にはそちらを優先して渡す
    if (access.full && path === "/marketing/v2" && env.HYOKA_EXEC_PASSWORD) return unlockWith(env.HYOKA_EXEC_PASSWORD, hub);
    const pw = env[dept.passwordEnv];
    if (pw) return unlockWith(pw, hub);
  }
  return next();
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
