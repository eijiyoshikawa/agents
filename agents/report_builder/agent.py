"""Agent 6: Report Builder — Google Slides 資料作成エージェント

全ての分析結果を統合し、クライアント向けの提案資料をGoogle Slidesで作成する。
"""

from __future__ import annotations

import json

import anthropic

from config.settings import settings
from shared.models import (
    PipelineContext,
    ReportResult,
)
from shared.google_drive_client import GoogleDriveClient
from shared.google_slides_client import GoogleSlidesClient

SYSTEM_PROMPT = """\
あなたはプレゼンテーション資料の構成専門家です。
戦略コンサルティングの提案資料を構成してください。

以下のスライド構成でJSONを出力してください:
slides配列の各要素:
- slide_type: "title" / "section" / "content" / "comparison" / "summary"
- title: スライドタイトル
- subtitle: サブタイトル（titleスライドのみ）
- bullets: 箇条書きポイント（配列）
- notes: スピーカーノート

推奨スライド構成（10-15枚）:
1. 表紙
2. エグゼクティブサマリー
3. 本日のアジェンダ
4. ビジネス課題の整理
5. 市場環境分析
6. 競合・ベンチマーク分析
7. 顧客インサイト
8. 参考事例（アナロジー）
9-11. 戦略オプション（2-3枚）
12. 推奨戦略
13. 想定リスクと対策
14. 実行ロードマップ
15. Next Steps

JSONで出力: { "slides": [...] }
"""


class ReportBuilderAgent:
    """分析結果をGoogle Slidesの提案資料に変換するエージェント"""

    def __init__(self) -> None:
        self._anthropic = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        self._drive = GoogleDriveClient()
        self._slides = GoogleSlidesClient(self._drive.credentials)

    async def run(self, context: PipelineContext) -> ReportResult:
        # 1. Claude でスライド構成を生成
        slide_structure = await self._generate_slide_structure(context)

        # 2. Google Slides に出力
        client_name = ""
        if context.structured_issues:
            client_name = context.structured_issues.client_name

        presentation = self._slides.create_presentation(
            f"戦略提案書 - {client_name}"
        )
        pres_id = presentation["id"]

        slide_count = 0
        for slide_data in slide_structure.get("slides", []):
            slide_type = slide_data.get("slide_type", "content")

            if slide_type == "title":
                self._slides.add_title_slide(
                    pres_id,
                    slide_data.get("title", ""),
                    slide_data.get("subtitle", ""),
                )
            else:
                slide_id = self._slides.add_slide(pres_id, layout="BLANK")

                # タイトル
                self._slides.add_text_box(
                    pres_id, slide_id,
                    slide_data.get("title", ""),
                    x=50, y=30, width=620, height=50, font_size=24,
                )

                # 本文（箇条書き）
                bullets = slide_data.get("bullets", [])
                if bullets:
                    body_text = "\n".join(f"• {b}" for b in bullets)
                    self._slides.add_text_box(
                        pres_id, slide_id,
                        body_text,
                        x=50, y=100, width=620, height=350, font_size=14,
                    )

            slide_count += 1

        return ReportResult(
            slides_url=presentation["url"],
            slide_count=slide_count,
            summary=f"{client_name}向け戦略提案書 ({slide_count}枚)",
        )

    async def _generate_slide_structure(self, context: PipelineContext) -> dict:
        user_message = self._build_context_message(context)

        response = self._anthropic.messages.create(
            model=settings.model,
            max_tokens=8192,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_message}],
        )

        result_text = response.content[0].text
        if "```json" in result_text:
            result_text = result_text.split("```json")[1].split("```")[0]
        elif "```" in result_text:
            result_text = result_text.split("```")[1].split("```")[0]

        return json.loads(result_text.strip())

    def _build_context_message(self, ctx: PipelineContext) -> str:
        parts = ["以下の分析結果から提案資料のスライド構成を作成してください:\n"]

        if ctx.structured_issues:
            si = ctx.structured_issues
            parts.append(f"## クライアント: {si.client_name} ({si.industry})")
            parts.append(f"背景: {si.business_context}")
            parts.append(f"中心的な問い: {si.core_question}")
            parts.append("イシュー:")
            for i in si.issues:
                parts.append(f"- [{i.priority}] {i.title}: {i.description}")

        if ctx.market_research:
            mr = ctx.market_research
            parts.append("\n## 市場調査結果")
            for ins in mr.insights:
                parts.append(f"- [{ins.category}] {ins.title}: {ins.summary}")
            parts.append(f"競合状況: {mr.competitive_landscape}")

        if ctx.analogy_result:
            parts.append("\n## アナロジー事例")
            for c in ctx.analogy_result.cases:
                parts.append(
                    f"- [{c.source_industry}] {c.company_or_case}: {c.transferable_insight}"
                )

        if ctx.strategy_result:
            sr = ctx.strategy_result
            parts.append(f"\n## 推奨戦略: {sr.recommended_strategy}")
            parts.append("戦略オプション:")
            for opt in sr.options:
                parts.append(f"- {opt.name} ({opt.feasibility}): {opt.description}")
            parts.append("批判的検証:")
            for cr in sr.critical_reviews:
                parts.append(f"- 前提: {cr.assumption_challenged} → リスク: {cr.risk}")
            if sr.redefined_issues:
                parts.append("再定義された課題:")
                for ri in sr.redefined_issues:
                    parts.append(f"- {ri}")

        return "\n".join(parts)
