/**
 * 評価制度サイトの Edge Middleware（Vercel・フレームワークなし）。
 *
 * 独自ドメイン（hyoka.let-inc.net）では経営ハブ（hub.let-inc.net）の共通ログイン
 * Cookie `let_hub` を検証し、未ログインならハブのログイン画面へ送る。
 *   - 経営陣ページ（/ /sales /marketing /marketing/v2 /bpo）は役員（exec）のみ
 *   - それ以外（/demo /my /manual /new-system、assets、data）はハブにログイン済みなら誰でも
 *   - 役員には HYOKA_EXEC_PASSWORD を解錠用 Cookie で渡し、assets/hub-unlock.js が
 *     ページのパスワード入力を自動で済ませる（データは従来どおりパスワードで暗号化）
 * *.vercel.app（let-hyoka.vercel.app）では何もしない（従来の JS パスワードのまま）。
 *
 * 環境変数:
 *   HUB_SESSION_SECRET  let_hub の署名鍵（ハブと同じ値。無いと独自ドメインでは 503）
 *   HUB_URL             ハブの URL（既定 https://hub.let-inc.net）
 *   HYOKA_EXEC_PASSWORD 経営陣ページのパスワード（任意。設定すると自動解錠）
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
  "/marketing/v2", "/marketing/v2.html",
  "/bpo", "/bpo.html",
]);
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

  const execPage = isExecPath(url.pathname);
  if (execPage && hub.role !== "exec") {
    return htmlResponse(403, "役員専用ページです", `このページは役員のみ閲覧できます（ログイン中: ${escapeHtml(hub.name || hub.email)}）。<a href="${hubUrl}">経営ハブへ戻る</a>`);
  }

  // 役員には解錠用 Cookie を渡す（JS から読めるよう HttpOnly なし。ハブのセッション期限まで）
  if (execPage && env.HYOKA_EXEC_PASSWORD) {
    const maxAge = Math.max(60, hub.exp - Math.floor(Date.now() / 1000));
    const cookie = `${UNLOCK_COOKIE}=${encodeURIComponent(env.HYOKA_EXEC_PASSWORD)}; Path=/; Max-Age=${maxAge}; Secure; SameSite=Lax`;
    return next({ "set-cookie": cookie });
  }
  return next();
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
