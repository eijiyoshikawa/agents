"use client";
import { useMemo, useState, useEffect } from "react";
import { ChevronRight, ChevronDown, File, Folder, ExternalLink, Search } from "lucide-react";

type FileEntry = { path: string; size: number; htmlUrl: string; isText: boolean; snippet?: string };

type Node = {
  name: string;
  path: string;
  children: Record<string, Node>;
  files: FileEntry[];
};

function buildTree(files: FileEntry[]): Node {
  const root: Node = { name: "", path: "", children: {}, files: [] };
  for (const f of files) {
    const parts = f.path.split("/");
    let cursor = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const seg = parts[i];
      const cp = parts.slice(0, i + 1).join("/");
      if (!cursor.children[seg]) cursor.children[seg] = { name: seg, path: cp, children: {}, files: [] };
      cursor = cursor.children[seg];
    }
    cursor.files.push(f);
  }
  return root;
}

export default function RepoFileTree({ files }: { files: FileEntry[]; fullName: string }) {
  const tree = useMemo(() => buildTree(files), [files]);
  const [q, setQ] = useState("");
  const [openAll, setOpenAll] = useState(true);

  // Anchor scrolling when ?path= or #path used
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = decodeURIComponent(window.location.hash.replace(/^#/, ""));
    if (hash) {
      const el = document.querySelector(`[data-path="${CSS.escape(hash)}"]`);
      if (el) (el as HTMLElement).scrollIntoView({ block: "center" });
    }
  }, [files]);

  const filtered = q.trim()
    ? files.filter((f) => f.path.toLowerCase().includes(q.toLowerCase()) || (f.snippet ?? "").toLowerCase().includes(q.toLowerCase()))
    : null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ファイル・本文を検索"
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border bg-transparent placeholder:text-[var(--fg-muted)] focus:outline-none focus:ring-2 focus:ring-brand-glow/30"
            style={{ borderColor: "var(--card-border)" }}
          />
        </div>
        <button onClick={() => setOpenAll((v) => !v)} className="btn btn-ghost text-xs">{openAll ? "すべて畳む" : "すべて開く"}</button>
      </div>

      {filtered ? (
        <ul className="space-y-1">
          {filtered.length === 0 ? (
            <li className="text-sm text-[var(--fg-muted)] text-center py-6">該当ファイルなし</li>
          ) : filtered.map((f) => (
            <li key={f.path} data-path={f.path} className="card-hover px-2 py-1.5 rounded text-xs flex items-center gap-2">
              <File className="w-3.5 h-3.5 text-[var(--fg-muted)] shrink-0" />
              <a href={f.htmlUrl} target="_blank" rel="noreferrer" className="font-mono truncate hover:underline flex-1">{f.path}</a>
              <span className="text-[10px] text-[var(--fg-muted)] shrink-0">{(f.size / 1024).toFixed(1)}KB</span>
              <ExternalLink className="w-3 h-3 text-[var(--fg-muted)] shrink-0" />
            </li>
          ))}
        </ul>
      ) : (
        <TreeNode node={tree} depth={0} defaultOpen={openAll} />
      )}
    </div>
  );
}

function TreeNode({ node, depth, defaultOpen }: { node: Node; depth: number; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen || depth < 2);
  useEffect(() => setOpen(defaultOpen || depth < 2), [defaultOpen, depth]);
  const childDirs = Object.values(node.children).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <ul className="space-y-0.5">
      {childDirs.map((c) => (
        <li key={c.path}>
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-1.5 text-xs w-full text-left hover:bg-[var(--hover)] rounded px-1.5 py-1"
          >
            {open ? <ChevronDown className="w-3 h-3 text-[var(--fg-muted)]" /> : <ChevronRight className="w-3 h-3 text-[var(--fg-muted)]" />}
            <Folder className="w-3.5 h-3.5 text-accent-indigo" />
            <span className="font-medium">{c.name}</span>
            <span className="text-[10px] text-[var(--fg-muted)] ml-1">{countFiles(c)}</span>
          </button>
          {open ? (
            <div style={{ paddingLeft: 16, borderLeft: "1px solid var(--card-border)", marginLeft: 8 }}>
              <TreeNode node={c} depth={depth + 1} defaultOpen={defaultOpen} />
            </div>
          ) : null}
        </li>
      ))}
      {node.files.sort((a, b) => a.path.localeCompare(b.path)).map((f) => (
        <li key={f.path} data-path={f.path} className="flex items-center gap-1.5 text-xs px-1.5 py-1 hover:bg-[var(--hover)] rounded">
          <File className="w-3.5 h-3.5 text-[var(--fg-muted)] ml-3.5" />
          <a href={f.htmlUrl} target="_blank" rel="noreferrer" className="font-mono truncate flex-1 hover:underline">{f.path.split("/").pop()}</a>
          <span className="text-[10px] text-[var(--fg-muted)]">{(f.size / 1024).toFixed(1)}KB</span>
          <ExternalLink className="w-3 h-3 text-[var(--fg-muted)]" />
        </li>
      ))}
    </ul>
  );
}

function countFiles(n: Node): number {
  return n.files.length + Object.values(n.children).reduce((s, c) => s + countFiles(c), 0);
}
