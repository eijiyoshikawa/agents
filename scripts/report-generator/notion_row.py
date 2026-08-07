#!/usr/bin/env python3
"""
report_data.json → Notion一覧DB 追記用の1行データ生成（ドライラン専用）

HANDOFF.md「次の一手 1.」の準備実装。クライアント名・対象月・主要KPI・デッキURL・
ステータス・QA結果を report_data.json から抽出し、Notion追記に使う行データを生成する。

このスクリプト自体は Notion に書き込まない（外部送信は docs/OPERATIONS.md により要承認）。
出力された properties を人間が確認・承認した後、Claude が Notion MCP
(notion-create-pages) で一覧DBに追記する運用。

想定する一覧DBのプロパティ設計（初回にDBを作る際もこの設計に合わせる）:
  クライアント(タイトル) / 対象月(テキスト) / プラットフォーム(セレクト) /
  フォロワー(数値) / フォロワー前回比(テキスト・符号付き%) / 動画視聴(数値) /
  PFアクセス(数値) / デッキURL(URL) / ステータス(セレクト) / QA結果(テキスト)

使い方:
  python3 notion_row.py path/to/report_data.json \
      --deck-url https://docs.google.com/presentation/d/<ID>/edit \
      --status 提出前TODOあり
  python3 notion_row.py path/to/report_data.json --markdown   # 表形式プレビュー

依存: 標準ライブラリのみ（qa_check.py を同梱ディレクトリから利用）。
"""
import argparse, json, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from qa_check import num, run_checks

STATUSES = ('生成済み', 'QA通過', '提出前TODOあり', '納品済み')


def to_int(v):
    n = num(v)
    return int(n) if n is not None else None


def qa_summary(d):
    f = run_checks(d)
    return f'ERROR {f.count("ERROR")} / 要確認 {f.count("要確認")} / TODO {f.count("TODO")}'


def build_row(d, deck_url, status):
    meta, acct = d.get('meta', {}), d.get('account', {})
    return {
        'クライアント': meta.get('client', ''),
        '対象月': meta.get('report_ym', ''),
        'プラットフォーム': 'TikTok',
        'フォロワー': to_int(acct.get('followers_now')),
        'フォロワー前回比': str(acct.get('followers_change', '')) + '%',
        '動画視聴': to_int(acct.get('video_views')),
        'PFアクセス': to_int(acct.get('pf_access')),
        'デッキURL': deck_url,
        'ステータス': status,
        'QA結果': qa_summary(d),
    }


def print_markdown(row):
    keys = list(row.keys())
    print('| ' + ' | '.join(keys) + ' |')
    print('|' + '---|' * len(keys))
    print('| ' + ' | '.join('' if row[k] is None else str(row[k]) for k in keys) + ' |')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('data', help='report_data.json のパス')
    ap.add_argument('--deck-url', default='', help='完成デッキのURL')
    ap.add_argument('--status', default='生成済み', choices=STATUSES)
    ap.add_argument('--markdown', action='store_true', help='表形式でプレビュー')
    args = ap.parse_args()

    d = json.load(open(args.data, encoding='utf-8'))
    row = build_row(d, args.deck_url, args.status)

    if args.markdown:
        print_markdown(row)
    else:
        print(json.dumps(row, ensure_ascii=False, indent=2))
    print('\n※ このデータはドライランです。Notionへの追記は承認後に Notion MCP で実行します。',
          file=sys.stderr)


if __name__ == '__main__':
    main()
