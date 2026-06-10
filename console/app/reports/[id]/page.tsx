import Link from "next/link";
import { notFound } from "next/navigation";
import { getReports, readRepoFile } from "@/lib/data";
import { mdToHtml } from "@/lib/markdown";

export async function generateStaticParams() {
  return getReports().map((r) => ({ id: r.id }));
}

export default async function ReportDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = getReports().find((r) => r.id === id);
  if (!report) notFound();
  const md = readRepoFile(report.file);
  const html = md ? await mdToHtml(md) : "";
  return (
    <div className="space-y-6">
      <nav className="text-sm text-ink-muted"><Link href="/reports">← 日次レポート一覧</Link></nav>
      <header>
        <h1 className="text-3xl font-bold">{report.id}</h1>
        <p className="text-ink-muted text-xs font-mono mt-1">{report.file}</p>
      </header>
      <article className="card prose-md max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
