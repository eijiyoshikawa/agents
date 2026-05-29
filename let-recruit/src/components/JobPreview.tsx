"use client";

import { useMemo } from "react";
import type { CompanyProfile, JobPosting } from "@/lib/types";
import { buildJobPostingHtml } from "@/lib/template";

interface Props {
  job: JobPosting;
  company: CompanyProfile;
}

/**
 * PDFと同一の自己完結HTMLをiframeで表示する。
 * これによりWebプレビューとPDF出力の見た目が常に一致する。
 */
export function JobPreview({ job, company }: Props) {
  const html = useMemo(() => buildJobPostingHtml(job, company), [job, company]);

  return (
    <div className="overflow-hidden rounded-2xl border border-border-soft bg-white shadow-sm">
      <iframe
        title="求人票プレビュー"
        srcDoc={html}
        className="h-[840px] w-full"
        sandbox=""
      />
    </div>
  );
}
