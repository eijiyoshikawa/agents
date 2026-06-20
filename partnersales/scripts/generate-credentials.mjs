#!/usr/bin/env node
// パートナーのログイン認証情報をまとめて発行する。
//
//   node scripts/generate-credentials.mjs [件数] [開始連番]
//   例: node scripts/generate-credentials.mjs 20 1
//
// 出力:
//   - 標準出力に CSV（ログインID, パスワード）… Notion 等に貼り付けて保管（平文はここだけ）
//   - credentials.sql … ハッシュ化して partner_credentials へ INSERT する SQL（Supabase で実行）
//
// パスワードは平文を DB に残さない。SQL では pgcrypto の crypt() でハッシュ化する。
import { writeFileSync } from "node:fs";

const ID_PREFIX = "LET-P";
const PW_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

const count = Number(process.argv[2] ?? 10);
const startSeq = Number(process.argv[3] ?? 1);

function loginIdForSeq(seq) {
  return `${ID_PREFIX}-${String(seq).padStart(4, "0")}`;
}
function generatePassword(length = 12) {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += PW_ALPHABET[Math.floor(Math.random() * PW_ALPHABET.length)];
  }
  return out;
}

const rows = [];
for (let i = 0; i < count; i++) {
  rows.push({ loginId: loginIdForSeq(startSeq + i), password: generatePassword() });
}

// CSV（Notion 保管用・平文）
const csv = ["login_id,password", ...rows.map((r) => `${r.loginId},${r.password}`)].join("\n");
process.stdout.write(csv + "\n");

// SQL（ハッシュ化して登録）。crypt() で bcrypt ハッシュを生成
const sql = [
  "-- partner_credentials へ未割り当ての認証情報を登録（パスワードはハッシュ化）",
  "create extension if not exists pgcrypto;",
  ...rows.map(
    (r) =>
      `insert into public.partner_credentials (login_id, password_hash, status) ` +
      `values ('${r.loginId}', crypt('${r.password}', gen_salt('bf')), 'unassigned') ` +
      `on conflict (login_id) do nothing;`
  ),
].join("\n");
writeFileSync(new URL("../credentials.sql", import.meta.url), sql + "\n");

process.stderr.write(
  `\n${rows.length} 件を発行しました。\n` +
    `  - 上記 CSV を Notion 等に保管してください（平文はここだけ）\n` +
    `  - credentials.sql を Supabase の SQL Editor で実行してください\n`
);
