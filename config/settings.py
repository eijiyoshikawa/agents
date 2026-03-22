"""Central configuration loaded from environment variables."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:
    # Anthropic
    anthropic_api_key: str = field(
        default_factory=lambda: os.environ["ANTHROPIC_API_KEY"]
    )
    model: str = "claude-sonnet-4-6"

    # Notion
    notion_api_token: str = field(
        default_factory=lambda: os.environ.get("NOTION_API_TOKEN", "")
    )

    # Google
    google_credentials_path: str = field(
        default_factory=lambda: os.environ.get(
            "GOOGLE_CREDENTIALS_PATH", "./config/google_credentials.json"
        )
    )
    google_token_path: str = field(
        default_factory=lambda: os.environ.get(
            "GOOGLE_TOKEN_PATH", "./config/google_token.json"
        )
    )


settings = Settings()
