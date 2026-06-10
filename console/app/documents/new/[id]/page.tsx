import Link from "next/link";
import { notFound } from "next/navigation";
import { getTemplates } from "@/lib/data";
import DocumentForm from "./form";

export async function generateStaticParams() {
  return getTemplates().map((t) => ({ id: t.id }));
}

export default async function NewDocument({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const template = getTemplates().find((t) => t.id === id);
  if (!template) notFound();

  return (
    <div className="space-y-6">
      <nav className="text-sm text-ink-muted"><Link href="/documents">← 書類作成</Link></nav>
      <header>
        <h1 className="text-3xl font-bold">{template.title}</h1>
        <p className="text-ink-soft mt-1">{template.description}</p>
        <div className="text-xs text-ink-muted mt-3 space-x-3">
          <span>担当: <span className="font-mono">{template.agent}</span></span>
          <span>出力: {template.output}</span>
          <span className="font-mono">{template.sourcePath}</span>
        </div>
      </header>
      <DocumentForm template={template} />
    </div>
  );
}
