"""Agent 4: Analogy Finder — アナロジー事例収集エージェント

異業種・異分野から転用可能な成功事例を収集し、
クライアントの課題に適用可能なインサイトを抽出する。
"""

from __future__ import annotations

import json

import anthropic

from config.settings import settings
from shared.models import StructuredIssues, AnalogyResult

SYSTEM_PROMPT = """\
あなたはアナロジー思考の専門家です。
異業種・異分野の成功事例から、クライアントの課題に転用可能な知見を見つけ出します。

与えられたビジネス課題に対して、以下を行ってください:

1. **異業種からの類似事例**を5-8件収集
2. 各事例について:
   - source_industry: 事例の業界
   - company_or_case: 企業名または事例名
   - summary: 事例の概要（150字以内）
   - transferable_insight: クライアントの課題に転用できる知見
   - source: 情報源

重要なポイント:
- 直接的な競合事例ではなく、異なる業界からの学びを重視
- 「構造が似ている」課題を持つ事例を探す
- SNS・デジタルマーケティング、AI活用、業務効率化、不動産テック等の
  領域を横断して事例を収集
- 具体的で実行可能な転用ポイントを提示

JSONで出力してください。キー: cases (配列)
"""


class AnalogyFinderAgent:
    """異業種アナロジー事例を収集するエージェント"""

    def __init__(self) -> None:
        self._anthropic = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    async def run(
        self,
        issues: StructuredIssues,
        web_search_results: list[dict] | None = None,
    ) -> AnalogyResult:
        user_message = f"""以下のビジネス課題に対するアナロジー事例を収集してください:

クライアント: {issues.client_name}
業界: {issues.industry}
ビジネス背景: {issues.business_context}
中心的な問い: {issues.core_question}

イシュー:
{chr(10).join(f'- {i.title}: {i.description}' for i in issues.issues)}

キーワード:
{chr(10).join(f'- {kw}' for i in issues.issues for kw in i.related_keywords)}
"""

        if web_search_results:
            user_message += "\n\n--- Web検索で見つかった事例 ---\n"
            for result in web_search_results:
                user_message += f"\nタイトル: {result.get('title', '')}\n"
                user_message += f"内容: {result.get('content', '')[:800]}\n"

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
        return AnalogyResult(**data)
