import fs from "node:fs";
import path from "node:path";

const DATA = path.join(process.cwd(), "data");
const REPO = path.resolve(process.cwd(), "..");

const read = <T>(name: string): T => JSON.parse(fs.readFileSync(path.join(DATA, name), "utf8"));

export type Agent = {
  id: string;
  name: string;
  parent?: string;
  department: string;
  color: string;
  promptPath: string | null;
  outputPath: string | null;
  headline?: string;
  role?: string;
  mission?: string;
  interferences?: string[];
  output: unknown;
};

export type Project = {
  id: string;
  slug: string;
  path: string;
  summary: string;
  fileCount: number;
  files: string[];
};

export type Report = { id: string; file: string; mtime: number };
export type Template = {
  id: string;
  title: string;
  description: string;
  agent: string;
  sourcePath: string;
  output: string;
  fields: { id: string; label: string; type: string; required?: boolean; options?: string[] }[];
};
export type Learnings = { instincts: { id: string; file: string; data: unknown }[]; sessions: { id: string; file: string; data: unknown }[] };
export type KPIs = {
  totals: { agents: number; withOutput: number; projects: number; reports: number };
  departments: { dept: string; count: number }[];
  interferenceAvg: string;
};

export const getAgents = (): Agent[] => read<Agent[]>("agents.json");
export const getProjects = (): Project[] => read<Project[]>("projects.json");
export const getReports = (): Report[] => read<Report[]>("reports.json");
export const getLearnings = (): Learnings => read<Learnings>("learnings.json");
export const getTemplates = (): Template[] => read<Template[]>("templates.json");
export const getKPIs = (): KPIs => read<KPIs>("kpis.json");
export const getDesignRefs = (): { id: string; file: string }[] => read("design-refs.json");

export function readRepoFile(rel: string): string | null {
  const p = path.join(REPO, rel);
  try { return fs.readFileSync(p, "utf8"); } catch { return null; }
}

export const colorClasses: Record<string, { bg: string; text: string; ring: string; dot: string }> = {
  brand: { bg: "bg-brand/10", text: "text-brand", ring: "ring-brand/20", dot: "bg-brand" },
  amber: { bg: "bg-accent-amber/15", text: "text-accent-amber", ring: "ring-accent-amber/30", dot: "bg-accent-amber" },
  red: { bg: "bg-accent-red/10", text: "text-accent-red", ring: "ring-accent-red/30", dot: "bg-accent-red" },
  indigo: { bg: "bg-accent-indigo/10", text: "text-accent-indigo", ring: "ring-accent-indigo/30", dot: "bg-accent-indigo" },
  teal: { bg: "bg-accent-teal/10", text: "text-accent-teal", ring: "ring-accent-teal/30", dot: "bg-accent-teal" },
  muted: { bg: "bg-ink/5", text: "text-ink-muted", ring: "ring-ink/10", dot: "bg-ink/30" },
};
