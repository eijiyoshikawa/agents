import type { CompanyProfile, JobPosting, Salary } from "./types";

/**
 * 求人票デザインの「単一ソース」。
 * 転職エージェント仕様の詳細求人票フォーマット。
 * Webプレビュー(iframe)とPDF(ブラウザ印刷)の双方がこのHTMLを使う。
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
<title>${esc(job.companyName || company.name)} 求人票 — ${esc(job.jobTitle || "募集職種")}</title>
<style>${styles(b)}</style>
</head>
<body>
<main class="sheet" id="sheet">
  ${titleBlock(job)}
  ${basicInfoTable(job)}
  ${wantedSection(job)}
  ${overviewSection(job)}
  ${selectionSection(job)}
  ${companyInfoSection(job, company)}
  ${agencySection(company)}
  ${noticeBlock()}
</main>
</body>
</html>`;
}

/* ---------- ① タイトル ---------- */

function titleBlock(job: JobPosting): string {
  const title = job.catchphrase || job.jobTitle || "求人票";
  return `<h1 class="title">${esc(title)}</h1>`;
}

/* ---------- ② 会社基本情報テーブル ---------- */

function basicInfoTable(job: JobPosting): string {
  const left = [
    kv("業種", job.industry),
    kv("職種", job.occupation),
    kv("設立年", job.establishedYear),
    kv("従業員数", job.employeeCount),
    kv("上場区分", job.listingStatus),
    kv("勤務地", job.workLocation),
  ];
  const right = [
    kv("雇用形態", job.employmentType),
    kv("採用ポジション", job.recruitPosition),
    kv("職位", job.jobLevel),
    kv("最終学歴", job.education),
    kv("職種経験", job.jobExperience),
    kv("業種経験", job.industryExperience),
    kv("想定年収", formatSalaryAnnual(job.salary)),
    kv("月給", formatSalaryMonthly(job.salary)),
  ];
  return `<section class="sec">
    <div class="sec-head">${esc(job.companyName || "募集企業")}</div>
    <div class="grid2">
      <div class="kvs">${left.join("")}</div>
      <div class="kvs">${right.join("")}</div>
    </div>
  </section>`;
}

/* ---------- ③ どのような人を求めているか ---------- */

function wantedSection(job: JobPosting): string {
  if (job.requiredSkills.length === 0 && job.idealCandidate.length === 0)
    return "";
  return `<h2 class="sec-title">どのような人を求めているか</h2>
  <section class="sec">
    <div class="grid2">
      <div class="col">
        <div class="col-head">必要条件</div>
        ${list(job.requiredSkills)}
      </div>
      <div class="col col-border">
        <div class="col-head">内定の可能性が高い人</div>
        ${list(job.idealCandidate)}
      </div>
    </div>
  </section>`;
}

/* ---------- ④ 求人概要 ---------- */

function overviewSection(job: JobPosting): string {
  const rows = [
    rowText("事業内容と今後の事業展開", job.businessDescription),
    rowText("募集背景", job.recruitBackground),
    rowText("理念・ビジョン", job.philosophy),
    rowText("働く人・社風", job.culture),
    rowJobContent(job),
    rowText("PRポイント", job.prPoints),
    rowList("この求人の魅力", job.appealPoints),
    rowText("現在の組織構成", job.orgStructure),
    rowSalary(job),
    rowWork(job),
    rowHolidays(job),
  ].filter(Boolean);
  if (rows.length === 0) return "";
  return `<h2 class="sec-title">求人概要</h2>
  <section class="sec"><table class="rows"><tbody>${rows.join("")}</tbody></table></section>`;
}

function rowJobContent(job: JobPosting): string {
  if (!job.summary && job.responsibilities.length === 0) return "";
  const body = [
    job.summary ? `<p class="lead">${esc(job.summary)}</p>` : "",
    list(job.responsibilities),
  ].join("");
  return tr("仕事内容", body);
}

function rowSalary(job: JobPosting): string {
  const detail = job.salaryDetail
    ? `<p class="lead">${esc(job.salaryDetail)}</p>`
    : "";
  const head = formatSalary(job.salary);
  if (!detail && !head) return "";
  return tr("給与・年収例", `${head ? `<p class="lead">${esc(head)}</p>` : ""}${detail}`);
}

function rowWork(job: JobPosting): string {
  const items = [
    job.workLocation && `勤務地：${esc(job.workLocation)}`,
    job.workHours && `勤務時間：${esc(job.workHours)}`,
    job.overtime && `残業：${esc(job.overtime)}`,
  ].filter(Boolean);
  if (items.length === 0) return "";
  return tr("勤務地・勤務時間", items.map((i) => `<p class="lead">${i}</p>`).join(""));
}

function rowHolidays(job: JobPosting): string {
  const parts = [
    job.holidays && `<p class="lead">休日休暇：${esc(job.holidays)}</p>`,
    job.smokingPolicy &&
      `<p class="lead">受動喫煙対策：${esc(job.smokingPolicy)}</p>`,
    job.benefits.length > 0
      ? `<p class="lead">福利厚生・諸手当</p>${list(job.benefits)}`
      : "",
  ]
    .filter(Boolean)
    .join("");
  if (!parts) return "";
  return tr("休日休暇・受動喫煙対策・福利厚生", parts);
}

/* ---------- ⑤ 選考情報 ---------- */

function selectionSection(job: JobPosting): string {
  const left = [
    job.casualInterview && `カジュアル面談の有無：${esc(job.casualInterview)}`,
    job.companyBriefing && `会社説明会の有無：${esc(job.companyBriefing)}`,
    job.aptitudeTest && `適性テストの有無：${esc(job.aptitudeTest)}`,
  ].filter(Boolean);
  const flow = job.selectionProcess.length
    ? `選考フロー：${job.selectionProcess.map(esc).join(" → ")}`
    : "";
  if (left.length === 0 && !flow) return "";
  return `<h2 class="sec-title">選考情報</h2>
  <section class="sec"><table class="rows"><tbody>
    <tr><th>選考情報</th><td>
      ${left.map((i) => `<p class="lead">${i}</p>`).join("")}
      ${flow ? `<p class="lead">${flow}</p>` : ""}
    </td></tr>
  </tbody></table></section>`;
}

/* ---------- ⑥ 会社情報 ---------- */

function companyInfoSection(job: JobPosting, c: CompanyProfile): string {
  const rows = [
    row2("会社名", job.companyName),
    row2("会社HP", job.companyWebsite),
    row2("本社所在地", job.companyAddress),
    row2("業種", job.industry),
    row2("設立年", job.establishedYear),
    row2("従業員数", job.employeeCount),
    row2("上場区分", job.listingStatus),
    row2("平均年齢", job.averageAge),
    row2("男女比率", job.genderRatio),
  ].filter(Boolean);
  void c;
  if (rows.length === 0) return "";
  return `<h2 class="sec-title">会社情報</h2>
  <section class="sec"><table class="rows rows-tight"><tbody>${rows.join("")}</tbody></table></section>`;
}

/* ---------- ⑦ 求人提供元 ---------- */

function agencySection(c: CompanyProfile): string {
  const a = c.agency;
  const rows = [
    row2("事業者名", a.name),
    row2("本社所在地", a.address),
    row2("有料職業紹介許可番号", a.licenseNumber !== "—" ? a.licenseNumber : ""),
  ].filter(Boolean);
  if (rows.length === 0) return "";
  return `<h2 class="sec-title">求人提供元 有料職業紹介事業者について</h2>
  <section class="sec"><table class="rows rows-tight"><tbody>${rows.join("")}</tbody></table></section>`;
}

function noticeBlock(): string {
  return `<div class="notice">
    <p>※応募意思を頂いた段階で、上記事業者へ特定個人情報の開示がされますことを、予めご了承ください。</p>
    <p>・本求人票に記載されている労働条件等の情報は、労働契約締結時の労働条件と異なる場合がありますので、ご相談いただけますと幸いです。</p>
    <p>・本求人票には一般には公開されていない情報も含まれておりますので、第三者への提供・転送を禁止させて頂いております。</p>
  </div>`;
}

/* ---------- 部品 ---------- */

function kv(label: string, value: string): string {
  if (!value) return "";
  return `<div class="kv"><span class="kv-l">${esc(label)}</span><span class="kv-v">${esc(value)}</span></div>`;
}

function tr(label: string, bodyHtml: string): string {
  return `<tr><th>${esc(label)}</th><td>${bodyHtml}</td></tr>`;
}

function rowText(label: string, value: string): string {
  if (!value) return "";
  // 改行を段落に変換
  const html = esc(value)
    .split(/\n+/)
    .filter((l) => l.trim())
    .map((l) => `<p class="lead">${l}</p>`)
    .join("");
  return tr(label, html);
}

function rowList(label: string, items: string[]): string {
  if (items.length === 0) return "";
  return tr(label, list(items));
}

function row2(label: string, value: string): string {
  if (!value) return "";
  return `<tr><th class="th-narrow">${esc(label)}</th><td>${esc(value)}</td></tr>`;
}

function list(items: string[]): string {
  if (items.length === 0) return "";
  return `<ul class="ul">${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;
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

function formatSalaryAnnual(s: Salary): string {
  if (s.type !== "年収") return "";
  return formatSalary(s).replace(/^年収\s*/, "");
}

function formatSalaryMonthly(s: Salary): string {
  if (s.type !== "月給") return "";
  return formatSalary(s).replace(/^月給\s*/, "");
}

/** HTMLエスケープ（XSS対策）。 */
export function esc(input: string): string {
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ---------- スタイル ---------- */

function styles(b: CompanyProfile["brand"]): string {
  return `
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap');
:root{
  --ink:${b.ink}; --accent:${b.accent}; --accent-dark:${b.accentDark};
  --head:#9e9e9e; --headtext:#fff; --surface:#f3f3f1;
  --muted:#666; --border:#bdbdbd;
}
*{box-sizing:border-box;margin:0;padding:0;}
html,body{background:#fff;color:var(--ink);
  font-family:"Noto Sans JP",-apple-system,BlinkMacSystemFont,"Hiragino Kaku Gothic ProN","Yu Gothic",Meiryo,sans-serif;
  -webkit-font-smoothing:antialiased;line-height:1.7;font-size:13px;}
.sheet{width:210mm;margin:0 auto;background:#fff;padding:14mm 14mm;}

.title{font-size:22px;font-weight:700;line-height:1.4;color:var(--ink);
  margin-bottom:18px;border-bottom:3px solid var(--accent);padding-bottom:10px;}

.sec-title{font-size:15px;font-weight:700;color:var(--ink);
  margin:22px 0 10px;padding-left:10px;border-left:5px solid var(--accent);}

.sec{margin-bottom:6px;}
.sec-head{background:var(--head);color:var(--headtext);font-weight:700;
  font-size:13px;padding:7px 12px;border:1px solid var(--border);}

.grid2{display:grid;grid-template-columns:1fr 1fr;border:1px solid var(--border);border-top:none;}
.kvs{padding:4px 0;}
.kvs:first-child{border-right:1px solid var(--border);}
.kv{display:flex;gap:8px;padding:4px 12px;font-size:12px;}
.kv-l{flex:0 0 88px;color:var(--muted);}
.kv-v{flex:1;color:var(--ink);}

.col{padding:10px 14px;}
.col-border{border-left:1px solid var(--border);}
.grid2 .col:first-child{}
.col-head{font-weight:700;font-size:13px;margin-bottom:6px;
  color:var(--accent-dark);border-bottom:1px solid var(--border);padding-bottom:4px;}

table.rows{width:100%;border-collapse:collapse;}
table.rows th{text-align:left;vertical-align:top;width:200px;
  background:var(--surface);border:1px solid var(--border);
  padding:9px 12px;font-size:12px;font-weight:700;color:var(--ink);}
table.rows td{border:1px solid var(--border);padding:9px 14px;font-size:12px;
  vertical-align:top;line-height:1.7;}
table.rows .th-narrow{width:160px;}
.rows-tight th,.rows-tight td{padding:6px 12px;}

.lead{font-size:12px;line-height:1.7;margin:2px 0;}
.lead + .ul{margin-top:4px;}

.ul{list-style:none;margin:4px 0;}
.ul li{position:relative;padding-left:14px;font-size:12px;line-height:1.65;margin:1px 0;}
.ul li::before{content:"";position:absolute;left:0;top:0.6em;width:5px;height:5px;
  background:var(--accent);border-radius:50%;}

.notice{margin-top:18px;font-size:10.5px;color:var(--muted);line-height:1.7;}
.notice p{margin:2px 0;}

@page{size:A4;margin:8mm;}
@media print{
  html,body{background:#fff;}
  .sheet{margin:0;padding:0;width:auto;}
  .sec,table.rows tr,.grid2{break-inside:avoid;}
  .sec-title{break-after:avoid;}
}
`;
}
