#!/usr/bin/env node
// Fetch metadata + READMEs + selected files from external GitHub repos and
// write results to data/repos.json and data/repo-files.json.
// Authentication: env GITHUB_TOKEN (PAT). If unset, the scanner exits with
// a friendly message and writes empty fallback data so the build still works.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
const OUT_DIR = path.resolve(__dirname, "../data");
const CFG_PATH = path.resolve(__dirname, "../config/repos.json");

fs.mkdirSync(OUT_DIR, { recursive: true });

const writeJSON = (name, data) => fs.writeFileSync(path.join(OUT_DIR, name), JSON.stringify(data, null, 2));

function writeEmpty(reason) {
  console.log(`[scan-github] ${reason} — skipping cross-repo ingestion.`);
  writeJSON("repos.json", { generatedAt: null, reason, items: [] });
  writeJSON("repo-files.json", { generatedAt: null, items: [] });
}

const cfg = JSON.parse(fs.readFileSync(CFG_PATH, "utf8"));
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const reposToFetch = (cfg.repos || []).filter((r) => !/REPLACE_/i.test(r.fullName));

if (!token) {
  writeEmpty("GITHUB_TOKEN が未設定です（Vercel/GitHub Actions / .env.local に追加してください）");
  process.exit(0);
}
if (reposToFetch.length === 0) {
  writeEmpty("config/repos.json にまだ実在のリポが登録されていません（REPLACE_REPO_* を実名に書き換えてください）");
  process.exit(0);
}

const HEADERS = {
  "Accept": "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "Authorization": `Bearer ${token}`,
  "User-Agent": "agents-console-scanner",
};

const limits = cfg.limits || {};
const MAX_FILES = limits.maxFilesPerRepo ?? 80;
const MAX_SIZE_KB = limits.maxFileSizeKB ?? 200;
const MAX_INDEX_KB = limits.maxIndexableTextKB ?? 50;
const EXCLUDE = (limits.excludePatterns || []).map((p) => new RegExp(p.replace(/\./g, "\\.").replace(/\*/g, ".*")));

async function gh(url, opts = {}) {
  const res = await fetch(url, { ...opts, headers: { ...HEADERS, ...(opts.headers || {}) } });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`GH ${res.status} ${url} :: ${t.slice(0, 200)}`);
  }
  return res.json();
}

function shouldSkip(path) {
  return EXCLUDE.some((re) => re.test(path));
}

function isProbablyBinary(name) {
  return /\.(png|jpe?g|gif|webp|ico|pdf|zip|tar|gz|mp[34]|mov|woff2?|ttf|otf|eot|wasm)$/i.test(name);
}

async function listTree(owner, repo, ref) {
  // Use git tree API (recursive) for efficiency
  const data = await gh(`https://api.github.com/repos/${owner}/${repo}/git/trees/${ref}?recursive=1`);
  return data.tree || [];
}

async function getRepoMeta(fullName) {
  return gh(`https://api.github.com/repos/${fullName}`);
}

async function getReadme(fullName) {
  try {
    const r = await gh(`https://api.github.com/repos/${fullName}/readme`, { headers: { Accept: "application/vnd.github.raw" } });
    // r is JSON (download_url) when not raw
    if (r.download_url) {
      const res = await fetch(r.download_url, { headers: HEADERS });
      if (res.ok) return await res.text();
    }
  } catch (e) { /* ignore */ }
  return "";
}

async function getRecentCommits(fullName) {
  try {
    const data = await gh(`https://api.github.com/repos/${fullName}/commits?per_page=5`);
    return data.map((c) => ({
      sha: c.sha.slice(0, 7),
      message: (c.commit?.message ?? "").split("\n")[0],
      author: c.commit?.author?.name ?? c.author?.login ?? "",
      date: c.commit?.author?.date ?? "",
      url: c.html_url,
    }));
  } catch { return []; }
}

async function fetchBlob(fullName, sha) {
  const data = await gh(`https://api.github.com/repos/${fullName}/git/blobs/${sha}`);
  if (data.encoding === "base64") return Buffer.from(data.content, "base64").toString("utf8");
  return data.content || "";
}

async function scanRepo(entry) {
  const fullName = entry.fullName;
  console.log(`[scan-github] → ${fullName}`);
  const meta = await getRepoMeta(fullName);
  const ref = meta.default_branch;
  const tree = await listTree(meta.owner.login, meta.name, ref);
  const allFiles = tree.filter((t) => t.type === "blob");

  // Filter by includePaths and exclusions
  const includes = entry.includePaths || ["README.md"];
  const matched = allFiles.filter((f) => {
    if (shouldSkip(f.path)) return false;
    return includes.some((inc) => f.path === inc || f.path.startsWith(`${inc}/`));
  });

  // Cap per repo
  const picked = matched
    .filter((f) => (f.size ?? 0) <= MAX_SIZE_KB * 1024)
    .slice(0, MAX_FILES);

  const files = [];
  for (const f of picked) {
    const isText = !isProbablyBinary(f.path);
    const indexable = isText && (f.size ?? 0) <= MAX_INDEX_KB * 1024;
    let snippet = "";
    if (indexable) {
      try {
        const text = await fetchBlob(fullName, f.sha);
        snippet = text.replace(/```[\s\S]*?```/g, "").slice(0, 600);
      } catch (e) { /* ignore */ }
    }
    files.push({
      repo: entry.id,
      repoFullName: fullName,
      path: f.path,
      size: f.size ?? 0,
      sha: f.sha,
      htmlUrl: `https://github.com/${fullName}/blob/${ref}/${f.path}`,
      isText,
      snippet,
    });
  }

  const readme = await getReadme(fullName);
  const commits = await getRecentCommits(fullName);

  return {
    id: entry.id,
    fullName,
    label: entry.label,
    category: entry.category,
    description: entry.description || meta.description || "",
    tags: entry.tags || [],
    includePaths: includes,
    repoMeta: {
      stars: meta.stargazers_count,
      forks: meta.forks_count,
      openIssues: meta.open_issues_count,
      defaultBranch: meta.default_branch,
      pushedAt: meta.pushed_at,
      private: meta.private,
      htmlUrl: meta.html_url,
      language: meta.language,
      topics: meta.topics ?? [],
    },
    readme: readme.slice(0, 16000),
    fileCount: files.length,
    files,
    commits,
  };
}

async function main() {
  const items = [];
  for (const entry of reposToFetch) {
    try {
      const repo = await scanRepo(entry);
      items.push(repo);
    } catch (e) {
      console.error(`[scan-github] ${entry.fullName} failed:`, e.message);
    }
  }
  const generatedAt = new Date().toISOString();
  writeJSON("repos.json", { generatedAt, reason: null, categories: cfg.categories, items });
  // Flat file index for cross-repo search
  const flatFiles = items.flatMap((r) =>
    r.files.map((f) => ({
      repo: r.id,
      repoLabel: r.label,
      path: f.path,
      htmlUrl: f.htmlUrl,
      snippet: f.snippet,
    }))
  );
  writeJSON("repo-files.json", { generatedAt, items: flatFiles });
  console.log(`[scan-github] OK — ${items.length} repos, ${flatFiles.length} files indexed.`);
}

main().catch((e) => { console.error(e); process.exit(0); /* don't break build */ });
