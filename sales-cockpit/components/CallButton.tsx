"use client";

import { Phone, Copy, Check } from "lucide-react";
import { useState } from "react";

const SCHEME = process.env.NEXT_PUBLIC_CALL_SCHEME || "tel";

/** 国内番号を発信用に正規化（ハイフン除去） */
function normalize(phone: string): string {
  return phone.replace(/[^\d+]/g, "");
}

/**
 * クリック発信ボタン。既定スキームは tel:（OS既定の電話アプリ＝Zoom Phoneを既定にすれば発信）。
 * NEXT_PUBLIC_CALL_SCHEME で callto 等に切替可能。
 */
export default function CallButton({ phone }: { phone: string | null }) {
  const [copied, setCopied] = useState(false);
  if (!phone) return <span className="text-xs text-ink-muted">番号なし</span>;

  const href = `${SCHEME}:${normalize(phone)}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(phone);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* クリップボード不可環境では無視 */
    }
  };

  return (
    <div className="inline-flex items-center gap-1">
      <a
        href={href}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand text-white text-xs font-medium hover:bg-brand-soft transition-colors duration-200 ease-standard"
        title={`${phone} に発信`}
      >
        <Phone size={13} />
        発信
      </a>
      <button
        onClick={copy}
        className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-ink-muted hover:bg-ink/[0.06] transition-colors"
        title="番号をコピー"
      >
        {copied ? <Check size={13} className="text-brand" /> : <Copy size={13} />}
      </button>
    </div>
  );
}
