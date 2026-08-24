#!/usr/bin/env node
/**
 * 実績セクション注入スクリプト (冪等)
 *
 * 対象ページの #main-content 末尾に <section id="eval-live"> と
 * assets/eval-section.js の読み込みを注入し、認証ゲートに
 * 「パスワードを sessionStorage (<key>_pw) へ保持する」1行を追加する。
 * (保持したパスワードが暗号化実績データの復号鍵になる)
 *
 * 使い方: node scripts/inject-eval-section.js
 * 実行後は public/ ミラーへも自動反映する。
 */
const { readFileSync, writeFileSync, copyFileSync, existsSync } = require("node:fs");
const { join, dirname } = require("node:path");

const ROOT = join(__dirname, "..");
const START = "<!-- eval-live:start -->";
const END = "<!-- eval-live:end -->";

const TARGETS = [
  { file: "sales.html", src: "/data/eval-exec.enc.json", key: "let_auth_exec", dept: "営業" },
  { file: "marketing.html", src: "/data/eval-exec.enc.json", key: "let_auth_exec", dept: "マーケティング" },
  { file: "demo/sales.html", src: "/data/eval-sales.enc.json", key: "let_auth_sales", dept: "営業" },
  { file: "demo/marketing.html", src: "/data/eval-marketing.enc.json", key: "let_auth_marketing", dept: "マーケティング" },
];

function sectionHtml(t) {
  return `${START}
<section id="eval-live" data-src="${t.src}" data-key="${t.key}" data-dept="${t.dept}"></section>
<script src="/assets/eval-section.js" defer></script>
${END}`;
}

for (const t of TARGETS) {
  const path = join(ROOT, t.file);
  let html = readFileSync(path, "utf8");

  // 既存の注入ブロックを除去して常に最新を入れ直す (冪等)
  html = html.replace(new RegExp(`\\n?${START}[\\s\\S]*?${END}\\n?`), "\n");

  // 認証ゲート開始の <script> 直前にある main-content 閉じタグの内側へ挿入
  const gateMarker = /(<\/div>\s*)(<script>\s*\(function\(\) \{\s*const PASS_HASH)/;
  if (!gateMarker.test(html)) {
    console.error(`✗ ${t.file}: 認証ゲートの位置を特定できませんでした (スキップ)`);
    continue;
  }
  html = html.replace(gateMarker, `${sectionHtml(t)}\n$1$2`);

  // ゲート通過時にパスワードを保持 (復号鍵)。既に注入済みならスキップ
  if (!html.includes("STORAGE_KEY + '_pw'")) {
    html = html.replace(
      /sessionStorage\.setItem\(STORAGE_KEY, '1'\);/,
      "sessionStorage.setItem(STORAGE_KEY, '1');\n      sessionStorage.setItem(STORAGE_KEY + '_pw', input);"
    );
  }

  writeFileSync(path, html);

  const mirror = join(ROOT, "public", t.file);
  if (existsSync(dirname(mirror))) copyFileSync(path, mirror);
  console.log(`✓ ${t.file} (+ public/ ミラー)`);
}

// 共有アセットもミラーへ
const assetSrc = join(ROOT, "assets/eval-section.js");
const assetDst = join(ROOT, "public/assets/eval-section.js");
require("node:fs").mkdirSync(dirname(assetDst), { recursive: true });
copyFileSync(assetSrc, assetDst);
console.log("✓ assets/eval-section.js → public/assets/");
