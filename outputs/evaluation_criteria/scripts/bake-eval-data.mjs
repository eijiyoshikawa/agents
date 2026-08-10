#!/usr/bin/env node
/**
 * 実績データ焼き付けスクリプト (slack-let → let-hyoka)
 *
 * slack-let の /api/eval/contribution から担当者別実績JSONを取得し、
 * ページ別パスワードで AES-GCM 暗号化して data/ と public/data/ に書き出す。
 * 平文の人件費・売上はリポジトリにもHTMLにも残らない。
 *
 * 使い方 (ターミナルから):
 *   CRON_SECRET=xxxx node scripts/bake-eval-data.mjs [--fy 2025]
 *   git add data public/data && git commit -m "chore: 実績データ反映" \
 *     && git push origin <作業ブランチ> && git checkout let-hyoka \
 *     && git merge <作業ブランチ> && git push origin let-hyoka
 *
 * 環境変数:
 *   CRON_SECRET        slack-let の認証トークン (必須)
 *   SLACK_LET_BASE     既定 https://slack-let.vercel.app
 */
import { webcrypto as crypto } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.SLACK_LET_BASE || "https://slack-let.vercel.app";
const SECRET = process.env.CRON_SECRET;
const ITER = 150000;

// パスワードは各ページの認証ゲートと同一 (README.md の一覧参照)
const TARGETS = [
  { out: "eval-exec.enc.json", password: "letyakuin2026", depts: null }, // 経営陣: 全部門
  { out: "eval-sales.enc.json", password: "saleslet1117", depts: ["営業"] },
  { out: "eval-marketing.enc.json", password: "makematsu2026", depts: ["マーケティング"] },
];

function fyArg() {
  const i = process.argv.indexOf("--fy");
  return i >= 0 ? `&fy=${process.argv[i + 1]}` : "";
}

async function encrypt(obj, password) {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const baseKey = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: ITER, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(JSON.stringify(obj)));
  const b64 = (buf) => Buffer.from(buf).toString("base64");
  return { v: 1, alg: "AES-GCM", kdf: "PBKDF2-SHA256", iter: ITER, salt: b64(salt), iv: b64(iv), ct: b64(ct) };
}

async function main() {
  if (!SECRET) {
    console.error("エラー: 環境変数 CRON_SECRET を設定してください (slack-let の認証トークン)");
    process.exit(1);
  }
  const url = `${BASE}/api/eval/contribution?token=${encodeURIComponent(SECRET)}${fyArg()}`;
  console.log(`取得中: ${BASE}/api/eval/contribution ...`);
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`エラー: ${res.status} ${await res.text()}`);
    process.exit(1);
  }
  const data = await res.json();
  console.log(`${data.fy_label} / メンバー${data.members.length}名 / 生成 ${data.generated_at}`);

  for (const t of TARGETS) {
    const view = {
      ...data,
      members: t.depts ? data.members.filter((m) => t.depts.includes(m.dept)) : data.members,
    };
    const payload = await encrypt(view, t.password);
    for (const dir of ["data", "public/data"]) {
      mkdirSync(join(ROOT, dir), { recursive: true });
      writeFileSync(join(ROOT, dir, t.out), JSON.stringify(payload));
    }
    console.log(`  ✓ ${t.out} (${view.members.length}名分を暗号化)`);
  }

  const dq = data.data_quality || {};
  if (dq.members_without_labor_cost?.length) {
    console.warn(`⚠️ 月額人件費が未登録: ${dq.members_without_labor_cost.join("・")} → Notion「メンバーマスタ」に記入`);
  }
  if (dq.clients_without_mf_mapping?.length) {
    console.warn(`⚠️ MF名寄せ未完了のクライアント: ${dq.clients_without_mf_mapping.length}社`);
  }
  console.log("\n完了。data/ と public/data/ をコミットして let-hyoka ブランチへプッシュすると本番反映されます。");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
