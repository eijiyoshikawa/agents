#!/usr/bin/env node
// Scan the repo and emit static JSON data consumed by Next.js pages at build time.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "../..");
const OUT_DIR = path.resolve(__dirname, "../data");
fs.mkdirSync(OUT_DIR, { recursive: true });

const read = (p) => { try { return fs.readFileSync(p, "utf8"); } catch { return null; } };
const readJSON = (p) => { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } };
const exists = (p) => { try { fs.accessSync(p); return true; } catch { return false; } };
const listDirs = (p) => exists(p) ? fs.readdirSync(p).filter((n) => fs.statSync(path.join(p, n)).isDirectory()) : [];
const listFiles = (p, ext) => exists(p) ? fs.readdirSync(p).filter((n) => !ext || n.endsWith(ext)) : [];

const DEPARTMENTS = {
  ceo: "統括", coo: "統括",
  retriever: "コンサル", issue_structurer: "コンサル", market_researcher: "コンサル",
  analogy_finder: "コンサル", marketing_analyst: "コンサル", strategist: "コンサル",
  devils_advocate: "コンサル", report_builder: "コンサル", document_builder: "コンサル",
  sales: "営業", marketing: "営業", customer_success: "営業", sns_operator: "営業",
  ad_operations: "営業", content_creator: "営業", pr: "営業", copywriter: "営業",
  crm: "営業", analytics: "営業", chatbot: "営業", seo_aieo: "営業",
  finance: "管理", hr: "管理", legal: "管理", compliance: "管理",
  subsidy_scout: "管理", subsidy_strategist: "管理", subsidy_writer: "管理",
  tech_lead: "開発", frontend_engineer: "開発", backend_engineer: "開発",
  infrastructure: "開発", qa_engineer: "開発", ui_ux_designer: "開発",
  data_engineer: "開発", designer: "開発", engineer: "開発", web_builder: "開発",
  web_creator: "開発", web_scraper: "開発",
  project_manager: "横断", qa_reviewer: "横断", kpi_dashboard: "横断", data_analyst: "横断",
  franchise_business_analyst: "プロジェクト", bo_automation_specialist: "プロジェクト",
  order_workflow_designer: "プロジェクト",
  orchestrator: "横断", quality_assurance: "廃止",
};

const DEPT_COLOR = {
  統括: "indigo", コンサル: "amber", 営業: "red", 管理: "teal",
  開発: "brand", 横断: "indigo", プロジェクト: "amber", 廃止: "muted",
};

// Extract front section of prompt.md
function extractAgentMeta(md) {
  if (!md) return {};
  const lines = md.split(/\r?\n/);
  const headline = lines.find((l) => l.startsWith("# "))?.slice(2).trim() ?? "";
  const role = extractSection(md, "役割");
  const mission = extractSection(md, "ミッション");
  const interferences = extractInterferences(md);
  return { headline, role, mission, interferences };
}

function extractSection(md, label) {
  const re = new RegExp(`^## *${label}\\s*$`, "m");
  const m = md.match(re);
  if (!m) return "";
  const start = m.index + m[0].length;
  const rest = md.slice(start);
  const next = rest.search(/^## /m);
  return (next === -1 ? rest : rest.slice(0, next)).trim();
}

function extractInterferences(md) {
  // Looks for "相互干渉" section and pulls agent_name-like tokens
  const sec = extractSection(md, "相互干渉") || extractSection(md, "相互干渉（検証を受ける相手）");
  if (!sec) return [];
  const names = new Set();
  sec.split(/\r?\n/).forEach((l) => {
    const matches = l.match(/`?[a-z_]+_(agent|engineer|analyst|scout|writer|reviewer|operator|specialist|designer|builder|manager|advocate|finder|researcher|structurer|creator|success|dashboard|lead)`?/gi);
    if (matches) matches.forEach((m) => names.add(m.replace(/`/g, "").toLowerCase()));
    const dictRefs = l.match(/\b(ceo|coo|sales|marketing|finance|hr|legal|engineer|designer|retriever|strategist|orchestrator|copywriter|crm|chatbot|analytics|compliance|pr|seo_aieo)\b/g);
    if (dictRefs) dictRefs.forEach((m) => names.add(m.toLowerCase()));
  });
  return [...names];
}

// ---- Agents ----
function scanAgents() {
  const agentsRoot = path.join(REPO, "agents");
  const out = [];
  for (const name of fs.readdirSync(agentsRoot)) {
    const dir = path.join(agentsRoot, name);
    if (!fs.statSync(dir).isDirectory()) continue;
    if (name === "outputs") continue;
    const promptPath = path.join(dir, "prompt.md");
    const outputPath = path.join(dir, "output.json");
    if (!exists(promptPath) && !exists(outputPath)) {
      // sub-agents (web_builder/*) — recurse one level
      const sub = listDirs(dir);
      for (const s of sub) {
        const subPrompt = path.join(dir, s, "prompt.md");
        if (exists(subPrompt)) {
          const md = read(subPrompt);
          out.push({
            id: `${name}/${s}`,
            name: s,
            parent: name,
            department: DEPARTMENTS[name] ?? "サブ",
            color: DEPT_COLOR[DEPARTMENTS[name] ?? "サブ"] ?? "muted",
            promptPath: path.relative(REPO, subPrompt),
            outputPath: null,
            ...extractAgentMeta(md),
            output: null,
          });
        }
      }
      continue;
    }
    const md = read(promptPath);
    const meta = extractAgentMeta(md);
    out.push({
      id: name,
      name,
      department: DEPARTMENTS[name] ?? "未分類",
      color: DEPT_COLOR[DEPARTMENTS[name] ?? "未分類"] ?? "muted",
      promptPath: exists(promptPath) ? path.relative(REPO, promptPath) : null,
      outputPath: exists(outputPath) ? path.relative(REPO, outputPath) : null,
      ...meta,
      output: exists(outputPath) ? readJSON(outputPath) : null,
    });
  }
  return out.sort((a, b) => a.id.localeCompare(b.id));
}

// ---- Projects ----
function scanProjects() {
  const root = path.join(REPO, "agents", "outputs");
  if (!exists(root)) return [];
  const out = [];
  for (const name of fs.readdirSync(root)) {
    const dir = path.join(root, name);
    if (!fs.statSync(dir).isDirectory()) continue;
    const files = walk(dir, 3);
    const readme = files.find((f) => /README\.md$/i.test(f));
    const docs = files.filter((f) => /\.(md|json|pdf|pptx|html)$/i.test(f));
    out.push({
      id: name,
      slug: encodeURIComponent(name),
      path: path.relative(REPO, dir),
      summary: readme ? (read(readme) || "").slice(0, 320) : "",
      fileCount: docs.length,
      files: docs.slice(0, 80).map((f) => path.relative(REPO, f)),
    });
  }
  return out;
}

function walk(dir, depth) {
  if (depth < 0) return [];
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) out.push(...walk(p, depth - 1));
    else out.push(p);
  }
  return out;
}

// ---- Daily reports ----
function scanDailyReports() {
  const dir = path.join(REPO, "daily_reports");
  if (!exists(dir)) return [];
  return fs.readdirSync(dir)
    .filter((n) => n.endsWith(".md"))
    .map((n) => ({ id: n.replace(/\.md$/, ""), file: `daily_reports/${n}`, mtime: fs.statSync(path.join(dir, n)).mtimeMs }))
    .sort((a, b) => b.id.localeCompare(a.id));
}

// ---- Learnings ----
function scanLearnings() {
  const root = path.join(REPO, "learnings");
  if (!exists(root)) return { instincts: [], sessions: [] };
  const instinctsDir = path.join(root, "instincts");
  const sessionsDir = path.join(root, "sessions");
  const readJsonsFrom = (d) => exists(d)
    ? fs.readdirSync(d).filter((n) => n.endsWith(".json")).map((n) => {
        const data = readJSON(path.join(d, n)) ?? {};
        return { id: n.replace(/\.json$/, ""), file: path.relative(REPO, path.join(d, n)), data };
      })
    : [];
  return { instincts: readJsonsFrom(instinctsDir), sessions: readJsonsFrom(sessionsDir) };
}

// ---- Design references ----
function scanDesignRefs() {
  const root = path.join(REPO, "design-md");
  if (!exists(root)) return [];
  return listDirs(root)
    .filter((n) => exists(path.join(root, n, "DESIGN.md")))
    .map((n) => ({ id: n, file: `design-md/${n}/DESIGN.md` }));
}

// ---- Document templates (proposal/report/subsidy etc.) ----
function buildTemplates() {
  const templates = [
    {
      id: "proposal-bpo", title: "AI開発BPO提案書",
      description: "建築工房様向けに使った提案書テンプレート（15セクション）",
      agent: "document_builder",
      sourcePath: "agents/document_builder/prompt.md",
      output: "PDF / HTML",
      fields: [
        { id: "client_name", label: "クライアント名", type: "text", required: true },
        { id: "problem", label: "課題", type: "textarea", required: true },
        { id: "solution", label: "解決策", type: "textarea", required: true },
        { id: "amount", label: "金額（円）", type: "number" },
      ],
    },
    {
      id: "subsidy", title: "補助金申請書",
      description: "Subsidy Writer による様式準拠の申請書ドラフト",
      agent: "subsidy_writer",
      sourcePath: "agents/subsidy_writer/prompt.md",
      output: "DOCX / PDF",
      fields: [
        { id: "subsidy_id", label: "補助金 ID（例: it-introduction-2026）", type: "text", required: true },
        { id: "company", label: "申請企業名", type: "text", required: true },
        { id: "project_summary", label: "事業概要", type: "textarea", required: true },
        { id: "budget", label: "事業費総額", type: "number" },
      ],
    },
    {
      id: "marketing-plan", title: "マーケティング戦略書",
      description: "Strategist + Marketing Analyst による戦略アウトプット",
      agent: "strategist",
      sourcePath: "agents/strategist/prompt.md",
      output: "Markdown / Slides",
      fields: [
        { id: "target", label: "ターゲット市場", type: "text", required: true },
        { id: "goals", label: "目標 (KGI/KPI)", type: "textarea", required: true },
        { id: "budget", label: "予算（円）", type: "number" },
      ],
    },
    {
      id: "report-builder", title: "Google Slides 提案資料",
      description: "Report Builder のスライド構成テンプレート",
      agent: "report_builder",
      sourcePath: "agents/report_builder/prompt.md",
      output: "Google Slides / PPTX",
      fields: [
        { id: "title", label: "資料タイトル", type: "text", required: true },
        { id: "audience", label: "想定読者", type: "text" },
        { id: "core_message", label: "コアメッセージ", type: "textarea", required: true },
      ],
    },
    {
      id: "seo-audit", title: "SEO 監査レポート",
      description: "SEO/AIEO Agent が 112項目チェックリストに基づき監査",
      agent: "seo_aieo",
      sourcePath: "agents/seo_aieo/SEO_CHECKLIST_112.md",
      output: "Markdown / JSON",
      fields: [
        { id: "target_url", label: "対象 URL", type: "text", required: true },
        { id: "main_keyword", label: "メインキーワード", type: "text", required: true },
        { id: "site_type", label: "サイト種別", type: "select", options: ["コーポレート", "メディア/ブログ", "EC", "LP", "SaaS"], required: true },
      ],
    },
  ];
  return templates;
}

// ---- KPIs (synthesized from outputs and reports) ----
function buildKPIs(agents, projects, reports) {
  const withOutput = agents.filter((a) => a.output);
  const interferenceMap = {};
  agents.forEach((a) => { interferenceMap[a.id] = (a.interferences ?? []).length; });
  const interferenceAvg = agents.length
    ? (Object.values(interferenceMap).reduce((s, n) => s + n, 0) / agents.length).toFixed(2)
    : "0";
  return {
    totals: {
      agents: agents.length,
      withOutput: withOutput.length,
      projects: projects.length,
      reports: reports.length,
    },
    departments: Object.entries(agents.reduce((acc, a) => {
      acc[a.department] = (acc[a.department] ?? 0) + 1;
      return acc;
    }, {})).map(([dept, count]) => ({ dept, count })),
    interferenceAvg,
  };
}

// ---- Drive manifest ----
function loadDrive() {
  const p = path.resolve(__dirname, "../config/drive-manifest.json");
  return readJSON(p) ?? { folders: [], stats: {} };
}

// ---- Load cross-repo data produced by scan-github.mjs (optional) ----
function loadCrossRepos() {
  const repos = readJSON(path.join(OUT_DIR, "repos.json")) ?? { items: [] };
  const files = readJSON(path.join(OUT_DIR, "repo-files.json")) ?? { items: [] };
  return { repos: repos.items || [], files: files.items || [] };
}

// ---- Search index (lightweight, client-loaded for cmd-k) ----
function buildSearchIndex(agents, projects, reports, templates, designRefs, drive, crossRepos) {
  const items = [];
  for (const a of agents) {
    items.push({ kind: "agent", id: a.id, label: a.name, sub: a.department, href: `/agents/${encodeURIComponent(a.id)}`, keywords: `${a.name} ${a.department} ${(a.headline||"").slice(0,80)}` });
  }
  for (const p of projects) {
    items.push({ kind: "project", id: p.id, label: p.id, sub: `${p.fileCount} files`, href: `/projects/${p.slug}`, keywords: p.id });
  }
  for (const r of reports) {
    items.push({ kind: "report", id: r.id, label: r.id, sub: "日次レポート", href: `/reports/${r.id}`, keywords: r.id });
  }
  for (const t of templates) {
    items.push({ kind: "template", id: t.id, label: t.title, sub: `書類: ${t.output}`, href: `/documents/new/${t.id}`, keywords: `${t.title} ${t.description}` });
  }
  for (const d of designRefs) {
    items.push({ kind: "design", id: d.id, label: d.id, sub: "design-md", href: `/projects`, keywords: `design ${d.id}` });
  }
  for (const f of drive.folders ?? []) {
    items.push({ kind: "drive", id: f.id, label: f.name, sub: "Google Drive", href: `/drive#${f.id}`, keywords: `drive ${f.name} ${(f.subfolders||[]).join(" ")}` });
  }
  for (const r of crossRepos.repos ?? []) {
    items.push({ kind: "repo", id: r.id, label: r.label, sub: r.fullName, href: `/repos/${r.id}`, keywords: `repo ${r.label} ${r.fullName} ${(r.tags||[]).join(" ")} ${r.description||""}` });
  }
  for (const f of crossRepos.files ?? []) {
    items.push({
      kind: "repo-file",
      id: `${f.repo}:${f.path}`,
      label: f.path,
      sub: f.repoLabel,
      href: `/repos/${f.repo}#${encodeURIComponent(f.path)}`,
      keywords: `${f.path} ${f.repoLabel} ${(f.snippet||"").slice(0,300)}`,
    });
  }
  const pages = [
    { kind: "page", label: "ダッシュボード", href: "/", keywords: "dashboard top" },
    { kind: "page", label: "エージェント", href: "/agents", keywords: "agents members 一覧" },
    { kind: "page", label: "組織マップ", href: "/org", keywords: "org map 組織 配置" },
    { kind: "page", label: "相互干渉グラフ", href: "/org/graph", keywords: "graph network 干渉" },
    { kind: "page", label: "プロジェクト", href: "/projects", keywords: "projects outputs 案件" },
    { kind: "page", label: "書類作成", href: "/documents", keywords: "documents 書類 generate" },
    { kind: "page", label: "分析", href: "/analytics", keywords: "analytics kpi 分析" },
    { kind: "page", label: "日次レポート", href: "/reports", keywords: "reports daily 日報" },
    { kind: "page", label: "ナレッジ", href: "/learnings", keywords: "learnings 学習 ナレッジ" },
    { kind: "page", label: "Google Drive", href: "/drive", keywords: "drive ファイル 基幹" },
    { kind: "page", label: "リポジトリ", href: "/repos", keywords: "repos github クロスリポ 横断" },
    { kind: "page", label: "コスト", href: "/costs", keywords: "cost 運用費 料金" },
    { kind: "page", label: "管理者設定", href: "/admin", keywords: "admin 管理者 設定" },
  ];
  return [...pages, ...items];
}

const agents = scanAgents();
const projects = scanProjects();
const reports = scanDailyReports();
const learnings = scanLearnings();
const designRefs = scanDesignRefs();
const templates = buildTemplates();
const drive = loadDrive();
const crossRepos = loadCrossRepos();
const kpis = buildKPIs(agents, projects, reports);
const searchIndex = buildSearchIndex(agents, projects, reports, templates, designRefs, drive, crossRepos);

const write = (name, data) => fs.writeFileSync(path.join(OUT_DIR, name), JSON.stringify(data, null, 2));
write("agents.json", agents);
write("projects.json", projects);
write("reports.json", reports);
write("learnings.json", learnings);
write("design-refs.json", designRefs);
write("templates.json", templates);
write("kpis.json", kpis);
write("drive.json", drive);
write("search-index.json", searchIndex);

console.log(`[scan] agents=${agents.length} projects=${projects.length} reports=${reports.length} learnings.instincts=${learnings.instincts.length} learnings.sessions=${learnings.sessions.length} designRefs=${designRefs.length} driveFolders=${(drive.folders||[]).length} crossRepos=${crossRepos.repos.length} crossFiles=${crossRepos.files.length} searchIndex=${searchIndex.length}`);
