"""Notion API wrapper for retrieving meeting minutes."""

from __future__ import annotations

from notion_client import Client as NotionSDKClient

from config.settings import settings


class NotionClient:
    """Notionから議事録ページを取得するクライアント"""

    def __init__(self) -> None:
        self._client = NotionSDKClient(auth=settings.notion_api_token)

    def get_page_text(self, page_id: str) -> str:
        """ページIDからプレーンテキストを取得"""
        blocks = self._fetch_all_blocks(page_id)
        return self._blocks_to_text(blocks)

    def search_meeting_pages(self, query: str, max_results: int = 5) -> list[dict]:
        """議事録ページを検索して一覧を返す"""
        response = self._client.search(
            query=query,
            filter={"property": "object", "value": "page"},
            page_size=max_results,
        )
        return [
            {
                "id": page["id"],
                "title": self._extract_title(page),
                "url": page.get("url", ""),
            }
            for page in response.get("results", [])
        ]

    # ── internal ────────────────────────────────────────────────
    def _fetch_all_blocks(self, block_id: str) -> list[dict]:
        blocks: list[dict] = []
        cursor = None
        while True:
            resp = self._client.blocks.children.list(
                block_id=block_id, start_cursor=cursor, page_size=100
            )
            blocks.extend(resp["results"])
            if not resp.get("has_more"):
                break
            cursor = resp.get("next_cursor")
        return blocks

    def _blocks_to_text(self, blocks: list[dict]) -> str:
        lines: list[str] = []
        for block in blocks:
            btype = block.get("type", "")
            data = block.get(btype, {})
            rich_texts = data.get("rich_text", [])
            text = "".join(rt.get("plain_text", "") for rt in rich_texts)
            if text:
                lines.append(text)
        return "\n".join(lines)

    @staticmethod
    def _extract_title(page: dict) -> str:
        props = page.get("properties", {})
        for prop in props.values():
            if prop.get("type") == "title":
                return "".join(
                    t.get("plain_text", "") for t in prop.get("title", [])
                )
        return ""
