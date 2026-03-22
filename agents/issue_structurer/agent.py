"""Agent 2: Issue Structurer — イシュー言語化・構造化エージェント

議事録から抽出された情報を基に、ビジネス課題を構造化し、
後続のリサーチエージェントが使える検索クエリも生成する。
"""

from __future__ import annotations

import json

import anthropic

from config.settings import settings
from shared.models import MeetingMinutes, StructuredIssues

SYSTEM_PROMPT = """\
あなたはSNSマーケティング・不動産BPO・AIシステム開発を行う企業の
戦略コンサルタントです。

会議の議事録データから、以下を構造化してください:

1. **ビジネス背景** (business_context): クライアントの状況を2-3文で要約
2. **中心的な問い** (core_question): この案件で答えるべき最も重要な問い
3. **イシュー一覧** (issues): 課題を分解し、以下の形式でリスト化
   - title: 課題名
   - description: 詳細説明
   - category: 市場 / 競合 / 顧客 / 内部 のいずれか
   - priority: high / medium / low
   - related_keywords: 関連キーワード
4. **リサーチクエリ** (research_queries): 市場調査・事例調査で検索すべきクエリ5-10個

事業領域を考慮してください:
- SNSマーケティング（Instagram, TikTok, YouTube運用/広告/クリエイティブ）
- 不動産業界特化型BPO（AIエージェント活用）
- AIシステム制作（補助金活用）
- LP等のWeb制作

JSONで出力してください。キー: client_name, industry, business_context,
core_question, issues, research_queries
"""


class IssueStructurerAgent:
    """議事録データからイシューを構造化するエージェント"""

    def __init__(self) -> None:
        self._anthropic = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    async def run(self, minutes: MeetingMinutes) -> StructuredIssues:
        user_message = f"""以下の会議データからイシューを構造化してください:

クライアント: {minutes.client_name}
業界: {minutes.industry}
会議タイトル: {minutes.title}
日時: {minutes.date}
参加者: {', '.join(minutes.participants)}

議題:
{chr(10).join(f'- {item}' for item in minutes.agenda_items)}

重要ポイント:
{chr(10).join(f'- {point}' for point in minutes.key_points)}

アクションアイテム:
{chr(10).join(f'- {item}' for item in minutes.action_items)}

議事録全文:
{minutes.raw_text[:5000]}
"""

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
        return StructuredIssues(**data)
