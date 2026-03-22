"""Orchestrator — 6エージェントのパイプライン制御

実行フロー:
  Step 1: Retriever          → MeetingMinutes
  Step 2: Issue Structurer   → StructuredIssues
  Step 3: Market Researcher  ┐
          Analogy Finder     ┘ (並列実行)
  Step 4: Strategist         → StrategyResult
  Step 5: Report Builder     → ReportResult (Google Slides URL)
"""

from __future__ import annotations

import asyncio
import logging

from shared.models import PipelineContext
from agents.retriever import RetrieverAgent
from agents.issue_structurer import IssueStructurerAgent
from agents.market_researcher import MarketResearcherAgent
from agents.analogy_finder import AnalogyFinderAgent
from agents.strategist import StrategistAgent
from agents.report_builder import ReportBuilderAgent

logger = logging.getLogger(__name__)


class Pipeline:
    """6エージェントを順次・並列で実行するオーケストレーター"""

    def __init__(self) -> None:
        self.retriever = RetrieverAgent()
        self.issue_structurer = IssueStructurerAgent()
        self.market_researcher = MarketResearcherAgent()
        self.analogy_finder = AnalogyFinderAgent()
        self.strategist = StrategistAgent()
        self.report_builder = ReportBuilderAgent()

    async def run(
        self,
        notion_page_id: str,
        drive_search_query: str | None = None,
        web_search_results: list[dict] | None = None,
        analogy_web_results: list[dict] | None = None,
        drive_documents: list[str] | None = None,
    ) -> PipelineContext:
        """パイプライン全体を実行"""
        ctx = PipelineContext()

        # ── Step 1: 議事録取得 ─────────────────────────────────
        logger.info("Step 1: Retriever - 議事録取得開始")
        ctx.meeting_minutes = await self.retriever.run(
            notion_page_id=notion_page_id,
            drive_search_query=drive_search_query,
        )
        logger.info(
            "Step 1 完了: %s (%s)",
            ctx.meeting_minutes.title,
            ctx.meeting_minutes.client_name,
        )

        # ── Step 2: イシュー構造化 ─────────────────────────────
        logger.info("Step 2: Issue Structurer - イシュー構造化開始")
        ctx.structured_issues = await self.issue_structurer.run(
            ctx.meeting_minutes
        )
        logger.info(
            "Step 2 完了: %d件のイシュー抽出",
            len(ctx.structured_issues.issues),
        )

        # ── Step 3: 並列リサーチ ───────────────────────────────
        logger.info("Step 3: 並列リサーチ開始 (Market Researcher + Analogy Finder)")
        market_task = self.market_researcher.run(
            issues=ctx.structured_issues,
            web_search_results=web_search_results,
            drive_documents=drive_documents,
        )
        analogy_task = self.analogy_finder.run(
            issues=ctx.structured_issues,
            web_search_results=analogy_web_results,
        )

        ctx.market_research, ctx.analogy_result = await asyncio.gather(
            market_task, analogy_task
        )
        logger.info(
            "Step 3 完了: %d件のインサイト, %d件のアナロジー",
            len(ctx.market_research.insights),
            len(ctx.analogy_result.cases),
        )

        # ── Step 4: 戦略構築 + 批判的検証 ──────────────────────
        logger.info("Step 4: Strategist - 戦略構築 + 批判的検証開始")
        ctx.strategy_result = await self.strategist.run(
            issues=ctx.structured_issues,
            market_research=ctx.market_research,
            analogy_result=ctx.analogy_result,
        )
        logger.info(
            "Step 4 完了: 推奨戦略=%s, %d件のオプション",
            ctx.strategy_result.recommended_strategy,
            len(ctx.strategy_result.options),
        )

        # ── Step 5: 資料作成 ───────────────────────────────────
        logger.info("Step 5: Report Builder - Google Slides作成開始")
        ctx.report_result = await self.report_builder.run(ctx)
        logger.info(
            "Step 5 完了: %s (%d枚)",
            ctx.report_result.slides_url,
            ctx.report_result.slide_count,
        )

        return ctx
