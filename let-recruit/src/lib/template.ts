import type { CompanyProfile, JobPosting, Salary } from "./types";

/**
 * 求人票デザインの「単一ソース」。
 * ここで生成する自己完結HTML(+埋め込みCSS)を、Webプレビュー(iframe)とPDF(Puppeteer)の
 * 双方が使うため、画面とPDFの見た目が常に一致する。
 * デザイントーンは feer（和文B2Bデフォルト）: クリーム地 × 墨 × ブランドオレンジ。
 */
export function buildJobPostingHtml(
  job: JobPosting,
  company: CompanyProfile,
): string {
  const b = company.brand;
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(company.name)} 求人票 — ${esc(job.jobTitle || "募集職種")}</title>
<style>${styles(b)}</style>
</head>
<body>
<main class="sheet" id="sheet">
  ${header(job, company)}
  ${heroBlock(job)}
  ${summaryBlock(job)}
  ${twoColumn(job)}
  ${conditionsBlock(job, company)}
  ${processBlock(job)}
  ${footer(company)}
</main>
<script>${fitScript()}</script>
</body>
</html>`;
}

/* ---------- セクション ---------- */

function header(job: JobPosting, c: CompanyProfile): string {
  return `<header class="head">
    <div class="brandmark">
      <span class="logo">${esc(c.name)}</span>
    </div>
    <div class="meta">
      <span>No.001 / RECRUIT</span>
      <span>${esc(job.employmentType || "正社員")}</span>
    </div>
  </header>`;
}

function heroBlock(job: JobPosting): string {
  const copy = job.catchphrase || "あなたの可能性が、ここで動き出す。";
  return `<section class="hero">
    <p class="kicker">[ JOB DESCRIPTION ]</p>
    <h1 class="catch">${esc(copy)}</h1>
    <p class="jobtitle">${esc(job.jobTitle || "募集職種")}</p>
  </section>`;
}

function summaryBlock(job: JobPosting): string {
  if (!job.summary) return "";
  return `<section class="block summary">
    <h2 class="h2"><span class="num">01</span>仕事内容</h2>
    <p class="lead">${esc(job.summary)}</p>
    ${list(job.responsibilities, "tasks")}
  </section>`;
}

function twoColumn(job: JobPosting): string {
  const left = [
    labeledList("必須要件", job.requiredSkills),
    labeledList("歓迎要件", job.preferredSkills),
  ].join("");
  const right = [
    labeledList("求める人物像", job.idealCandidate),
    labeledList("この仕事の魅力", job.appealPoints, true),
  ].join("");
  if (!left && !right) return "";
  return `<section class="block">
    <h2 class="h2"><span class="num">02</span>応募要件</h2>
    <div class="cols">
      <div class="col">${left}</div>
      <div class="col">${right}</div>
    </div>
  </section>`;
}

function conditionsBlock(job: JobPosting, c: CompanyProfile): string {
  void c;
  const rows = [
    row("雇用形態", job.employmentType),
    row("給与", formatSalary(job.salary)),
    row("勤務地", job.workLocation),
    row("勤務時間", job.workHours),
    row("休日・休暇", job.holidays),
    rowList("福利厚生", job.benefits),
  ]
    .filter(Boolean)
    .join("");
  if (!rows) return "";
  return `<section class="block">
    <h2 class="h2"><span class="num">03</span>募集要項</h2>
    <table class="conditions"><tbody>${rows}</tbody></table>
  </section>`;
}

function processBlock(job: JobPosting): string {
  if (job.selectionProcess.length === 0) return "";
  const steps = job.selectionProcess
    .map(
      (s, i) =>
        `<li class="step"><span class="step-no">${pad(i + 1)}</span><span>${esc(
          s,
        )}</span></li>`,
    )
    .join("");
  return `<section class="block">
    <h2 class="h2"><span class="num">04</span>選考プロセス</h2>
    <ol class="steps">${steps}</ol>
  </section>`;
}

function footer(c: CompanyProfile): string {
  const contacts = [
    c.website && `WEB ${esc(c.website)}`,
    c.email && `MAIL ${esc(c.email)}`,
    c.tel && c.tel !== "—" && `TEL ${esc(c.tel)}`,
  ]
    .filter(Boolean)
    .join("　/　");
  return `<footer class="foot">
    <div class="foot-brand">
      <span class="logo">${esc(c.name)}</span>
      <span class="tagline">${esc(c.tagline)}</span>
    </div>
    <p class="foot-about">${esc(c.about)}</p>
    <p class="foot-contact">${contacts}</p>
  </footer>`;
}

/* ---------- 部品 ---------- */

function labeledList(label: string, items: string[], accent = false): string {
  if (items.length === 0) return "";
  return `<div class="labeled">
    <p class="label ${accent ? "label-accent" : ""}">${esc(label)}</p>
    ${list(items, accent ? "appeal" : "")}
  </div>`;
}

function list(items: string[], cls = ""): string {
  if (items.length === 0) return "";
  const lis = items.map((i) => `<li>${esc(i)}</li>`).join("");
  return `<ul class="ul ${cls}">${lis}</ul>`;
}

function row(label: string, value: string): string {
  if (!value) return "";
  return `<tr><th>${esc(label)}</th><td>${esc(value)}</td></tr>`;
}

function rowList(label: string, items: string[]): string {
  if (items.length === 0) return "";
  const inner = items.map((i) => `<span class="chip">${esc(i)}</span>`).join("");
  return `<tr><th>${esc(label)}</th><td><div class="chips">${inner}</div></td></tr>`;
}

export function formatSalary(s: Salary): string {
  const yen = (n: number) => `${(n / 10000).toLocaleString("ja-JP")}万円`;
  let range = "";
  if (s.min && s.max) range = `${yen(s.min)} 〜 ${yen(s.max)}`;
  else if (s.min) range = `${yen(s.min)} 〜`;
  else if (s.max) range = `〜 ${yen(s.max)}`;
  const head = range ? `${s.type} ${range}` : "";
  return [head, s.note].filter(Boolean).join("　");
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** HTMLエスケープ（XSS対策・テンプレート挿入の安全化）。 */
export function esc(input: string): string {
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ---------- スタイル（feerトークン埋め込み・A4） ---------- */

/**
 * 印刷時、コンテンツがA4 1枚に必ず収まるよう .sheet を縦方向に自動スケールする。
 * 印刷ダイアログを開く前(beforeprint)に高さを測り、A4の印字可能高を超える分だけ
 * transform: scale() で縮小する。印刷後(afterprint)に元へ戻す。
 */
function fitScript(): string {
  return `
(function(){
  var sheet=document.getElementById('sheet');
  if(!sheet)return;
  // A4印字可能高 = 297mm - 上下padding(8mm*2)。96dpi換算(1mm≒3.7795px)。
  var MM=3.7795275591;
  var avail=(297-16)*MM;
  function fit(){
    sheet.style.zoom='1';
    var h=sheet.scrollHeight;
    // 1ページに必ず収めるためzoomで縮小（はみ出る時のみ）。安全マージン2%。
    var z = h>avail ? (avail/h)*0.98 : 1;
    sheet.style.zoom=String(z);
  }
  // 印刷前に確実にフィット。スクリーンでも初期表示時に一度フィットさせておく。
  window.addEventListener('beforeprint',fit);
  if(document.fonts && document.fonts.ready){document.fonts.ready.then(fit);}
  window.addEventListener('load',fit);
  setTimeout(fit,300);
})();
`;
}

function styles(b: CompanyProfile["brand"]): string {
  return `
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600;700&family=Work+Sans:wght@400;600;700&display=swap');
:root{
  --ink:${b.ink}; --cream:#ffffff; --accent:${b.accent};
  --accent-dark:${b.accentDark}; --surface:#f7f7f5;
  --muted:#9ca3af; --border:#e5e7eb;
}
*{box-sizing:border-box;margin:0;padding:0;}
html,body{background:#ffffff;color:var(--ink);
  font-family:"Work Sans","Noto Sans JP",-apple-system,BlinkMacSystemFont,"Hiragino Kaku Gothic ProN","Yu Gothic",Meiryo,sans-serif;
  -webkit-font-smoothing:antialiased;line-height:1.5;}
.sheet{width:210mm;margin:0 auto;background:#ffffff;
  padding:10mm 12mm;position:relative;}
.mono{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;}

.head{display:flex;justify-content:space-between;align-items:flex-start;
  border-bottom:1px solid var(--ink);padding-bottom:6px;}
.brandmark{display:flex;align-items:center;gap:10px;}
.logo{font-weight:700;font-size:15px;letter-spacing:0.04em;color:var(--accent);}
.meta{font-family:ui-monospace,Menlo,monospace;font-size:9px;color:var(--muted);
  display:flex;flex-direction:column;align-items:flex-end;gap:1px;letter-spacing:0.05em;}

.hero{padding:12px 0 10px;border-bottom:1px solid var(--border);}
.kicker{font-size:9px;font-weight:600;letter-spacing:0.14em;color:var(--accent);margin-bottom:6px;}
.catch{font-size:22px;font-weight:700;line-height:1.2;letter-spacing:-0.01em;}
.jobtitle{margin-top:8px;font-size:13px;font-weight:600;color:var(--ink);}
.jobtitle::before{content:"";display:inline-block;width:18px;height:2px;
  background:var(--accent);vertical-align:middle;margin-right:8px;}

.block{padding:10px 0;border-bottom:1px solid var(--border);}
.h2{font-size:13px;font-weight:700;margin-bottom:7px;display:flex;align-items:center;gap:8px;}
.num{font-family:ui-monospace,Menlo,monospace;font-size:11px;font-weight:700;
  color:#fff;background:var(--ink);border-radius:999px;
  width:26px;height:18px;display:inline-flex;align-items:center;justify-content:center;}
.lead{font-size:11.5px;line-height:1.6;}

.ul{list-style:none;margin-top:5px;}
.ul li{position:relative;padding-left:14px;font-size:11px;line-height:1.55;}
.ul li::before{content:"";position:absolute;left:0;top:0.55em;width:5px;height:5px;
  background:var(--ink);border-radius:50%;}
.ul.tasks li::before,.ul.appeal li::before{background:var(--accent);}

.cols{display:flex;gap:20px;}
.col{flex:1;min-width:0;}
.labeled{margin-bottom:9px;}
.label{font-size:11px;font-weight:600;letter-spacing:0.04em;
  border-left:3px solid var(--ink);padding-left:7px;}
.label-accent{border-left-color:var(--accent);color:var(--accent-dark);}

.conditions{width:100%;border-collapse:collapse;}
.conditions th{text-align:left;vertical-align:top;width:96px;
  font-size:10.5px;font-weight:600;color:var(--ink);background:var(--surface);
  border:1px solid var(--border);padding:5px 8px;}
.conditions td{font-size:11px;border:1px solid var(--border);padding:5px 8px;line-height:1.5;}
.chips{display:flex;flex-wrap:wrap;gap:4px;}
.chip{font-size:10px;border:1px solid var(--ink);border-radius:999px;padding:1px 8px;}

.steps{list-style:none;display:flex;flex-wrap:wrap;gap:7px;}
.step{display:flex;align-items:center;gap:6px;font-size:11px;
  background:var(--surface);border:1px solid var(--border);border-radius:999px;padding:4px 11px 4px 4px;}
.step-no{font-family:ui-monospace,Menlo,monospace;font-size:10px;font-weight:700;
  color:#fff;background:var(--accent);border-radius:50%;
  width:18px;height:18px;display:inline-flex;align-items:center;justify-content:center;}

.foot{margin-top:12px;padding-top:9px;border-top:2px solid var(--ink);}
.foot-brand{display:flex;align-items:center;gap:10px;}
.tagline{font-size:11.5px;font-weight:600;}
.foot-about{font-size:10.5px;color:var(--ink);margin-top:5px;line-height:1.5;}
.foot-contact{font-family:ui-monospace,Menlo,monospace;font-size:10px;
  color:var(--muted);margin-top:6px;letter-spacing:0.03em;}

@page{size:A4;margin:0;}
@media print{
  html,body{background:#fff;width:210mm;height:auto;margin:0;padding:0;
    overflow:hidden;}
  .sheet{margin:0;box-shadow:none;width:210mm;height:auto;
    padding:8mm 12mm;overflow:hidden;}
  /* 全要素のページ分割を物理的に禁止し、1ページに収める */
  .sheet,.sheet *{break-inside:avoid;page-break-inside:avoid;
    break-before:avoid;page-break-before:avoid;
    break-after:avoid;page-break-after:avoid;}
}
`;
}
