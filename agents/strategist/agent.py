"""Agent 5: Strategist — 戦略オプション構築 + 批判的検証エージェント

すべてのリサーチ結果を統合し、戦略オプションを構築した後、
Devil's Advocate として自ら批判的に検証し、課題を再定義する。
"""

from __future__ import annotations

import json

import anthropic

from config.settings import settings
from shared.models import (
    StructuredIssues,
    MarketResearchResult,
    AnalogyResult,
    StrategyResult,
)

SYSTEM_PROMPT = """\
あなたは戦略コンサルタントであり、同時に批判的思考の専門家です。
2つのフェーズで作業を行ってください。

## フェーズ1: 戦略オプション構築
すべてのリサーチ結果を統合し、3-5つの戦略オプションを構築してください。
各オプションには:
- name: 戦略名
- description: 概要
- pros: メリット
- cons: デメリット
- feasibility: 実現可能性 (high/medium/low)
- expected_impact: 期待効果

## フェーズ2: Devil's Advocate（批判的検証）
構築した戦略を以下の観点で徹底的に批判してください:
- 前提条件は本当に正しいか？
- 見落としているリスクは？
- クライアントの組織能力で実行可能か？
- 市場環境の変化に耐えうるか？

そして、批判を踏まえて:
1. critical_reviews: 各批判と対策
2. redefined_issues: 再定義された課題
3. recommended_strategy: 最終的に推奨する戦略

事業領域の知識:
- SNSマーケティング（Instagram, TikTok, YouTube運用/広告/クリエイティブ）
- 不動産業界特化型BPO（AIエージェント活用による業務効率化）
- AIシステム制作（補助金活用）
- LP等のWeb制作

JSONで出力してください。キー: recommended_strategy, options, critical_reviews,
redefined_issues
"""


class StrategistAgent:
    """戦略構築と批判的検証を一体で行うエージェント"""

    def __init__(self) -> None:
        self._anthropic = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    async def run(
        self,
        issues: StructuredIssues,
        market_research: MarketResearchResult,
        analogy_result: AnalogyResult,
    ) -> StrategyResult:
        user_message = f"""以下のすべての情報を統合し、戦略オプションを構築→批判的検証してください。

## ビジネス課題
クライアント: {issues.client_name}
業界: {issues.industry}
背景: {issues.business_context}
中心的な問い: {issues.core_question}

イシュー:
{chr(10).join(f'- [{i.priority}] {i.title}: {i.description}' for i in issues.issues)}

## 市場調査結果
{chr(10).join(f'- [{ins.category}] {ins.title}: {ins.summary}' for ins in market_research.insights)}

顧客セグメント: {', '.join(market_research.customer_segments)}
市場トレンド: {', '.join(market_research.market_trends)}
競合状況: {market_research.competitive_landscape}

## アナロジー事例
{chr(10).join(f'- [{c.source_industry}] {c.company_or_case}: {c.transferable_insight}' for c in analogy_result.cases)}
"""

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

        data = json.loads(result_text.strip())
        return StrategyResult(**data)
