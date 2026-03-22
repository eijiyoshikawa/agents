"""Google Slides API wrapper for creating proposal presentations."""

from __future__ import annotations

from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials


class GoogleSlidesClient:
    """Google Slides の作成・編集を行うクライアント"""

    def __init__(self, credentials: Credentials) -> None:
        self._service = build("slides", "v1", credentials=credentials)

    def create_presentation(self, title: str) -> dict:
        """新しいプレゼンテーションを作成"""
        body = {"title": title}
        presentation = self._service.presentations().create(body=body).execute()
        return {
            "id": presentation["presentationId"],
            "url": f"https://docs.google.com/presentation/d/{presentation['presentationId']}/edit",
        }

    def add_slide(
        self,
        presentation_id: str,
        layout: str = "BLANK",
    ) -> str:
        """スライドを追加して、スライドIDを返す"""
        requests = [
            {
                "createSlide": {
                    "slideLayoutReference": {"predefinedLayout": layout},
                }
            }
        ]
        resp = self._batch_update(presentation_id, requests)
        return resp["replies"][0]["createSlide"]["objectId"]

    def add_text_box(
        self,
        presentation_id: str,
        slide_id: str,
        text: str,
        x: float = 50,
        y: float = 50,
        width: float = 600,
        height: float = 400,
        font_size: float = 14,
    ) -> None:
        """スライドにテキストボックスを追加"""
        box_id = f"textbox_{slide_id}_{int(x)}_{int(y)}"
        requests = [
            {
                "createShape": {
                    "objectId": box_id,
                    "shapeType": "TEXT_BOX",
                    "elementProperties": {
                        "pageObjectId": slide_id,
                        "size": {
                            "width": {"magnitude": width, "unit": "PT"},
                            "height": {"magnitude": height, "unit": "PT"},
                        },
                        "transform": {
                            "scaleX": 1,
                            "scaleY": 1,
                            "translateX": x,
                            "translateY": y,
                            "unit": "PT",
                        },
                    },
                }
            },
            {
                "insertText": {
                    "objectId": box_id,
                    "text": text,
                    "insertionIndex": 0,
                }
            },
            {
                "updateTextStyle": {
                    "objectId": box_id,
                    "style": {
                        "fontSize": {"magnitude": font_size, "unit": "PT"},
                    },
                    "textRange": {"type": "ALL"},
                    "fields": "fontSize",
                }
            },
        ]
        self._batch_update(presentation_id, requests)

    def add_title_slide(
        self, presentation_id: str, title: str, subtitle: str = ""
    ) -> str:
        """タイトルスライドを追加"""
        slide_id = self.add_slide(presentation_id, layout="TITLE")
        # Get the slide to find placeholder IDs
        presentation = (
            self._service.presentations()
            .get(presentationId=presentation_id)
            .execute()
        )
        for slide in presentation.get("slides", []):
            if slide["objectId"] == slide_id:
                for element in slide.get("pageElements", []):
                    placeholder = element.get("placeholder", {})
                    obj_id = element["objectId"]
                    if placeholder.get("type") == "CENTERED_TITLE":
                        self._insert_text(presentation_id, obj_id, title)
                    elif placeholder.get("type") == "SUBTITLE":
                        self._insert_text(presentation_id, obj_id, subtitle)
        return slide_id

    def _insert_text(
        self, presentation_id: str, object_id: str, text: str
    ) -> None:
        requests = [
            {"insertText": {"objectId": object_id, "text": text, "insertionIndex": 0}}
        ]
        self._batch_update(presentation_id, requests)

    def _batch_update(self, presentation_id: str, requests: list[dict]) -> dict:
        body = {"requests": requests}
        return (
            self._service.presentations()
            .batchUpdate(presentationId=presentation_id, body=body)
            .execute()
        )
