import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
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
      <Link href="/documents" className="inline-flex items-center gap-1.5 text-sm text-[var(--fg-muted)] hover:text-[var(--fg)]">
        <ArrowLeft className="w-3.5 h-3.5" /> 書類作成
      </Link>
      <header>
        <h1 className="text-3xl font-bold tracking-tight">{template.title}</h1>
        <p className="text-sm text-[var(--fg-muted)] mt-1">{template.description}</p>
        <div className="flex flex-wrap gap-2 mt-3 text-xs">
          <span className="pill">担当: <span className="font-mono ml-1">{template.agent}</span></span>
          <span className="pill">出力: {template.output}</span>
          <span className="pill font-mono">{template.sourcePath}</span>
        </div>
      </header>
      <DocumentForm template={template} />
    </div>
  );
}
