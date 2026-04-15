import type { Bulletin, BulletinCategory } from "@/lib/types/database";
import { CATEGORY_CONFIG } from "@/lib/types/database";

interface BulletinPdfData {
  bulletin: Bulletin;
  organizationName: string;
  date: string;
}

/**
 * Generate HTML for bulletin PDF rendering.
 * Uses server-side HTML → PDF conversion approach.
 */
export function generateBulletinHtml({ bulletin, organizationName, date }: BulletinPdfData): string {
  const categoryLabel = CATEGORY_CONFIG[bulletin.category as BulletinCategory]?.label ?? "一般連絡";

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Noto Sans JP', sans-serif;
      padding: 40px;
      font-size: 13px;
      line-height: 2.0;
      color: #111827;
      max-width: 210mm;
    }
    .header {
      border-bottom: 2px solid #2980B9;
      padding-bottom: 12px;
      margin-bottom: 20px;
    }
    .org-name { font-size: 10px; color: #6B7280; margin-bottom: 4px; }
    .title { font-size: 20px; font-weight: 700; color: #1A5276; margin-bottom: 8px; }
    .meta { display: flex; justify-content: space-between; font-size: 10px; color: #6B7280; }
    .badge {
      background: #F2F3F4; border-radius: 4px; padding: 2px 8px;
      font-size: 10px; font-weight: 700;
    }
    .content { font-size: 13px; line-height: 2.0; margin-bottom: 20px; white-space: pre-wrap; }
    .footer {
      position: fixed; bottom: 30px; left: 40px; right: 40px;
      border-top: 1px solid #E5E7EB; padding-top: 8px;
      display: flex; justify-content: space-between;
      font-size: 9px; color: #6B7280;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="org-name">${escapeHtml(organizationName)}</div>
    <div class="title">${escapeHtml(bulletin.title)}</div>
    <div class="meta">
      <span class="badge">${escapeHtml(categoryLabel)}</span>
      <span>${escapeHtml(date)}</span>
    </div>
  </div>
  <div class="content">${escapeHtml(bulletin.content)}</div>
  <div class="footer">
    <span>まちボード — ${escapeHtml(organizationName)}</span>
    <span>発行日: ${escapeHtml(date)}</span>
  </div>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
