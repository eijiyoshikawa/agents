"""Agent 3: Market Researcher — 市場調査 + 顧客分析エージェント

Web検索とGoogle Driveの既存資料から、市場・競合・ベンチマーク・顧客情報を収集し分析する。
"""

from __future__ import annotations

import json

import anthropic

from config.settings import settings
from shared.models import StructuredIssues, MarketResearchResult

SYSTEM_PROMPT = """\
あなたは市場調査と顧客分析の専門家です。
SNSマーケティング、不動産BPO、AIシステム開発の業界知識を持っています。

与えられたイシューと検索クエリに基づき、以下の観点で分析結果をまとめてください:

1. **市場インサイト** (insights): 各調査結果を以下の形式で
   - category: market / competitor / benchmark / customer
   - title: インサイトのタイトル
   - summary: 要約（200字以内）
   - source: 情報源
   - relevance: クライアントの課題との関連性

2. **顧客セグメント** (customer_segments): 想定されるターゲット顧客セグメント

3. **市場トレンド** (market_trends): 重要な市場トレンド

4. **競合状況** (competitive_landscape): 競合環境の概要

調査対象:
- 市場規模・成長率
- 主要プレイヤーと競合動向
- ベンチマーク事例（KPI・成功指標）
- 顧客ニーズ・ペインポイント
- 業界特有の規制や動向

JSONで出力してください。
"""


class MarketResearcherAgent:
    """市場調査・顧客分析を実行するエージェント"""

    def __init__(self) -> None:
        self._anthropic = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    async def run(
        self,
        issues: StructuredIssues,
        web_search_results: list[dict] | None = None,
        drive_documents: list[str] | None = None,
    ) -> MarketResearchResult:
        """
        Args:
            issues: Agent 2 の出力
            web_search_results: MCP Web検索で取得済みの結果
            drive_documents: Google Driveから取得した過去資料のテキスト
        """
        user_message = f"""以下のビジネス課題に基づいて市場調査・顧客分析を行ってください:

クライアント: {issues.client_name}
業界: {issues.industry}
ビジネス背景: {issues.business_context}
中心的な問い: {issues.core_question}

イシュー:
{chr(10).join(f'- [{i.category}/{i.priority}] {i.title}: {i.description}' for i in issues.issues)}

調査クエリ:
{chr(10).join(f'- {q}' for q in issues.research_queries)}
"""

        if web_search_results:
            user_message += "\n\n--- Web検索結果 ---\n"
            for result in web_search_results:
                user_message += f"\nタイトル: {result.get('title', '')}\n"
                user_message += f"URL: {result.get('url', '')}\n"
                user_message += f"内容: {result.get('content', '')[:1000]}\n"

        if drive_documents:
            user_message += "\n\n--- 過去の社内資料 ---\n"
            for doc in drive_documents[:3]:
                user_message += f"\n{doc[:2000]}\n"

        response = self._anthropic.messages.create(
            model=settings.model,
            max_tokens=4096,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_message}],
        )

        result_text = response.content[0].text
        if "```json" in result_text:
            result_text = result_text.split("```json")[1].split("```")[0]
        elif "```" in result_text:
            result_text = result_text.split("```")[1].split("```")[0]

        data = json.loads(result_text.strip())
        return MarketResearchResult(**data)
