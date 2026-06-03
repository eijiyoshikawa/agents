"use client";

import { useMemo, useRef, useImperativeHandle, forwardRef } from "react";
import type { CompanyProfile, JobPosting } from "@/lib/types";
import { buildJobPostingHtml } from "@/lib/template";

interface Props {
  job: JobPosting;
  company: CompanyProfile;
}

export interface JobPreviewHandle {
  print: () => void;
}

/**
 * PDFと同一の自己完結HTMLをiframeで表示する。
 * 印刷(=ブラウザの「PDFで保存」)はこのiframeをそのまま印刷するため、
 * 閲覧環境のフォント（日本語含む）で確実にレンダリングされる。
 */
export const JobPreview = forwardRef<JobPreviewHandle, Props>(
  function JobPreview({ job, company }, ref) {
    const html = useMemo(
      () => buildJobPostingHtml(job, company),
      [job, company],
    );
    const iframeRef = useRef<HTMLIFrameElement>(null);

    useImperativeHandle(ref, () => ({
      print() {
        const win = iframeRef.current?.contentWindow;
        if (!win) return;
        win.focus();
        win.print();
      },
    }));

    return (
      <div className="overflow-hidden rounded-2xl border border-border-soft bg-white shadow-sm">
        <iframe
          ref={iframeRef}
          title="求人票プレビュー"
          srcDoc={html}
          className="h-[840px] w-full"
        />
      </div>
    );
  },
);
