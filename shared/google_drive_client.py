"""Google Drive API wrapper for retrieving past proposal documents."""

from __future__ import annotations

import os
from pathlib import Path

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

from config.settings import settings

SCOPES = [
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/presentations",
]


class GoogleDriveClient:
    """Google Drive からファイル検索・テキスト取得を行うクライアント"""

    def __init__(self) -> None:
        self._creds = self._authenticate()
        self._service = build("drive", "v3", credentials=self._creds)

    def search_files(
        self, query: str, mime_type: str | None = None, max_results: int = 10
    ) -> list[dict]:
        """ファイル名でDrive内を検索"""
        q_parts = [f"name contains '{query}'", "trashed = false"]
        if mime_type:
            q_parts.append(f"mimeType = '{mime_type}'")
        q = " and ".join(q_parts)

        resp = (
            self._service.files()
            .list(q=q, pageSize=max_results, fields="files(id,name,mimeType,webViewLink)")
            .execute()
        )
        return resp.get("files", [])

    def export_as_text(self, file_id: str) -> str:
        """Google Docs をプレーンテキストとしてエクスポート"""
        content = (
            self._service.files()
            .export(fileId=file_id, mimeType="text/plain")
            .execute()
        )
        return content.decode("utf-8") if isinstance(content, bytes) else content

    @property
    def credentials(self) -> Credentials:
        return self._creds

    # ── authentication ──────────────────────────────────────────
    def _authenticate(self) -> Credentials:
        creds = None
        token_path = Path(settings.google_token_path)
        creds_path = Path(settings.google_credentials_path)

        if token_path.exists():
            creds = Credentials.from_authorized_user_file(str(token_path), SCOPES)

        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                if not creds_path.exists():
                    raise FileNotFoundError(
                        f"Google credentials not found at {creds_path}. "
                        "Download OAuth2 client credentials from Google Cloud Console."
                    )
                flow = InstalledAppFlow.from_client_secrets_file(
                    str(creds_path), SCOPES
                )
                creds = flow.run_local_server(port=0)
            token_path.parent.mkdir(parents=True, exist_ok=True)
            token_path.write_text(creds.to_json())

        return creds
