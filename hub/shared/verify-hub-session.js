/**
 * let_hub Cookie の検証（Node / CommonJS・依存なし）。
 * 各ダッシュボード（slack_let など Node 実行環境）にこのファイルをコピーして使う。
 *
 *   const { verifyHubSession, parseCookie } = require("./verify-hub-session");
 *   const token = parseCookie(req.headers.cookie)["let_hub"];
 *   const hub = verifyHubSession(token, process.env.HUB_SESSION_SECRET);
 *   if (hub) { /* hub.email / hub.name / hub.role ("exec"|"manager"|"staff") *\/ }
 *
 * ペイロードは hub/lib/hub-session.ts と同一形式: base64url(JSON).base64url(HMAC-SHA256)
 */
const crypto = require("node:crypto");

const ROLES = ["staff", "manager", "exec"];
const RANK = { staff: 0, manager: 1, exec: 2 };

function b64urlToBuf(s) {
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function verifyHubSession(token, secret, now = Math.floor(Date.now() / 1000)) {
  if (!token || !secret) return null;
  const parts = String(token).split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  try {
    const expected = crypto.createHmac("sha256", secret).update(parts[0]).digest();
    const actual = b64urlToBuf(parts[1]);
    if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return null;
    const s = JSON.parse(b64urlToBuf(parts[0]).toString("utf8"));
    if (!s || s.v !== 1 || typeof s.email !== "string" || typeof s.exp !== "number" || !ROLES.includes(s.role)) return null;
    if (s.exp <= now) return null;
    return s;
  } catch {
    return null;
  }
}

/** role が minRole 以上か */
function hasRole(role, minRole) {
  return RANK[role] !== undefined && RANK[minRole] !== undefined && RANK[role] >= RANK[minRole];
}

/** Cookie ヘッダ文字列 → { name: value } */
function parseCookie(header) {
  /** @type {Record<string, string>} */
  const out = {};
  if (!header) return out;
  for (const part of String(header).split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    if (!k) continue;
    try {
      out[k] = decodeURIComponent(part.slice(i + 1).trim());
    } catch {
      out[k] = part.slice(i + 1).trim();
    }
  }
  return out;
}

module.exports = { verifyHubSession, hasRole, parseCookie, HUB_COOKIE: "let_hub" };
