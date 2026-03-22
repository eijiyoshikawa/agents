"""Agent 1: Retriever — 議事録取得・分解エージェント

Notionから議事録を取得し、構造化されたMeetingMinutesモデルに変換する。
Google Driveから過去の提案資料も取得し、コンテキストとして付加する。
"""

from __future__ import annotations

import anthropic

from config.settings import settings
from shared.models import MeetingMinutes
from shared.notion_client import NotionClient
from shared.google_drive_client import GoogleDriveClient

SYSTEM_PROMPT = """\
あなたは議事録分析の専門家です。
与えられた議事録テキストを分析し、以下を抽出してください:

1. 会議タイトル
2. 会議日時
3. 参加者一覧
4. 議題一覧
5. 重要ポイント（議論の核心）
6. アクションアイテム
7. クライアント名
8. 業界

JSONで出力してください。キーは以下の通り:
title, date, participants, agenda_items, key_points, action_items, client_name, industry

過去の提案資料が提供された場合、そのコンテキストも考慮して
クライアントとの関係性や過去の提案内容を key_points に含めてください。
"""


class RetrieverAgent:
    """Notionの議事録とGoogle Driveの過去資料を取得・分解するエージェント"""

    def __init__(self) -> None:
        self._anthropic = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        self._notion = NotionClient()
        self._drive = GoogleDriveClient()

    async def run(
        self,
        notion_page_id: str,
        drive_search_query: str | None = None,
    ) -> MeetingMinutes:
        # 1. Notionから議事録を取得
        raw_text = self._notion.get_page_text(notion_page_id)

        # 2. 過去の提案資料を検索（オプション）
        past_context = ""
        if drive_search_query:
            files = self._drive.search_files(
                drive_search_query,
                mime_type="application/vnd.google-apps.document",
                max_results=3,
            )
            for f in files:
                try:
                    doc_text = self._drive.export_as_text(f["id"])
                    past_context += f"\n\n--- 過去資料: {f['name']} ---\n{doc_text[:3000]}"
                except Exception:
                    continue

        # 3. Claude で構造化
        user_message = f"以下の議事録を分析してください:\n\n{raw_text}"
        if past_context:
            user_message += f"\n\n--- 過去の提案資料 ---\n{past_context}"

        response = self._anthropic.messages.create(
            model=settings.model,
            max_tokens=4096,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_message}],
        )

        result_text = response.content[0].text

        # JSONを抽出してパース
        import json
        # ```json ... ``` ブロックがある場合に対応
        if "```json" in result_text:
            result_text = result_text.split("```json")[1].split("```")[0]
        elif "```" in result_text:
            result_text = result_text.split("```")[1].split("```")[0]

        data = json.loads(result_text.strip())
        data["raw_text"] = raw_text

        return MeetingMinutes(**data)
