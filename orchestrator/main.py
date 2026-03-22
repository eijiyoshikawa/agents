"""Entry point for the strategy agent pipeline."""

from __future__ import annotations

import argparse
import asyncio
import logging
import sys

from orchestrator.pipeline import Pipeline


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    parser = argparse.ArgumentParser(
        description="戦略提案エージェント パイプライン",
    )
    parser.add_argument(
        "notion_page_id",
        help="Notion 議事録ページID (例: 1234abcd-5678-efgh-...)",
    )
    parser.add_argument(
        "--drive-query",
        default=None,
        help="Google Drive で過去資料を検索するクエリ",
    )
    args = parser.parse_args()

    pipeline = Pipeline()
    ctx = asyncio.run(
        pipeline.run(
            notion_page_id=args.notion_page_id,
            drive_search_query=args.drive_query,
        )
    )

    # 結果サマリー
    print("\n" + "=" * 60)
    print("パイプライン完了")
    print("=" * 60)

    if ctx.structured_issues:
        print(f"クライアント: {ctx.structured_issues.client_name}")
        print(f"中心的な問い: {ctx.structured_issues.core_question}")
        print(f"イシュー数: {len(ctx.structured_issues.issues)}")

    if ctx.strategy_result:
        print(f"推奨戦略: {ctx.strategy_result.recommended_strategy}")
        print(f"戦略オプション数: {len(ctx.strategy_result.options)}")

    if ctx.report_result:
        print(f"\nGoogle Slides: {ctx.report_result.slides_url}")
        print(f"スライド数: {ctx.report_result.slide_count}")

    print("=" * 60)


if __name__ == "__main__":
    main()
