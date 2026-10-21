#!/usr/bin/env node
// パスワードから HUB_PASSWORD_HASHES 用のハッシュを生成する。
//   node scripts/hash-password.mjs <email>
// パスワードは対話的に入力する（画面に表示されず、シェル履歴にも残らない）。
import { randomBytes, scryptSync } from "node:crypto";
import { createInterface } from "node:readline";

const email = (process.argv[2] ?? "").trim().toLowerCase();
if (!email.includes("@")) {
  console.error("使い方: node scripts/hash-password.mjs <email>");
  process.exit(1);
}

const prompt = `${email} のパスワード（8文字以上・入力は表示されません）: `;
const rl = createInterface({ input: process.stdin, output: process.stderr, terminal: true });
// 入力文字をエコーしない（プロンプトだけ表示）
rl._writeToOutput = (s) => {
  if (s.startsWith(prompt)) process.stderr.write(prompt);
};
rl.question(prompt, (pw) => {
  rl.close();
  process.stderr.write("\n");
  if (pw.length < 8) {
    console.error("8文字以上にしてください");
    process.exit(1);
  }
  const salt = randomBytes(16);
  const hash = scryptSync(pw, salt, 64, { N: 16384 });
  const value = `scrypt$16384$${salt.toString("base64")}$${hash.toString("base64")}`;
  console.log(JSON.stringify({ [email]: value }));
});
