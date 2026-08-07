#!/usr/bin/env python3
"""
extraction_master.json -> report_data.json 変換（クライアント非依存・再利用可）

抽出マスター（Claudeがスクショから生成）から、レンダラ(Code.gs)が消費する
report_data.json を機械生成する。アカウント数値・月次表・上位投稿は自動算出、
ナラティブ(総括/施策)は数値からのドラフトを生成し【要レビュー】を付す。

使い方:
  python3 build_report_data.py \
      --master path/to/extraction_master.json \
      --out    path/to/report_data.json \
      --client REVECAREERAGENCY --ym 2026年6月 --data-date 2026年6月3日 \
      --account-name 黒崎社長就職エージェント --handle kurosaki_shacho \
      --period 2025年6月〜2026年5月 --months 6

依存: 標準ライブラリのみ。
"""
import argparse, json, collections


def num(s):
    if s is None:
        return None
    s = str(s).replace(',', '').replace('+', '').replace('%', '').strip()
    if s in ('', '—', '-'):
        return None
    try:
        if s.endswith('M'):
            return int(float(s[:-1]) * 1_000_000)
        if s.endswith('K'):
            return int(float(s[:-1]) * 1_000)
        return float(s) if '.' in s else int(s)
    except ValueError:
        return None


def avg(vals):
    vals = [v for v in vals if v is not None]
    return round(sum(vals) / len(vals)) if vals else None


def fmt(n):
    return '' if n is None else f"{n:,}"


def month_label(ym):
    y, m = ym.split('-')
    return f"{y}/{int(m)}月"


def build_account(master):
    """28日概要 + アカウント概要から slide6 ブロックを作る"""
    a = master.get('account', {})
    d28 = master.get('overview_by_period', {}).get('d28', {})
    foll_now = a.get('followers_total', '')
    net = num(d28.get('net_followers'))
    foll_now_n = num(foll_now)
    start = fmt(foll_now_n - net) if (foll_now_n is not None and net is not None) else ''
    posts = master.get('posts', [])
    return {
        "header": "",  # 呼び出し側で data-date を埋める
        "followers_start": start,
        "followers_now": foll_now,
        "followers_change": str(d28.get('new_followers_pct', '')).replace('%', ''),
        "posts_total": str(len(posts)) if posts else '',
        "post_freq": str(round(len(posts) / 12)) if posts else '',
        "comments_pct": str(d28.get('comments_pct', '—')).replace('%', '') or '—',
        "video_views": d28.get('video_views', ''),
        "video_views_pct": str(d28.get('video_views_pct', '')).replace('%', ''),
        "pf_access": d28.get('pf_views', ''),
        "pf_access_pct": str(d28.get('pf_views_pct', '')).replace('%', ''),
        "likes": d28.get('likes', ''),
        "likes_pct": str(d28.get('likes_pct', '')).replace('%', ''),
        "comments": d28.get('comments', ''),
        "shares": d28.get('shares', ''),
        "shares_pct": str(d28.get('shares_pct', '')).replace('%', ''),
    }


def build_monthly(posts, months):
    by = collections.OrderedDict()
    for p in posts:
        by.setdefault(p['date'][:7], []).append(p)
    rows = []
    for ym, ps in by.items():
        rows.append([
            month_label(ym), str(len(ps)),
            fmt(avg([num(p.get('views')) for p in ps])),
            fmt(avg([num(p.get('reach')) for p in ps])),
            fmt(avg([num(p.get('likes')) for p in ps])),
            fmt(avg([num(p.get('saves')) for p in ps])),
            fmt(avg([num(p.get('pf')) for p in ps])),
            (lambda v: '' if v is None else f"{v}s")(avg([num(p.get('avg_s')) for p in ps])),
            (lambda v: '' if v is None else f"{v}%")(avg([num(p.get('cr')) for p in ps])),
        ])
    header = ['月', '投稿数', '平均再生', '平均リーチ', '平均いいね', '平均保存', '平均PF閲覧', '平均視聴秒', '平均完了率']
    return [header] + rows[-months:]


def top_table(p):
    header = ['投稿日', '視聴回数', 'いいね', 'コメント', 'シェア', '保存', 'PF閲覧', '完了率']
    row = [p['date'], p.get('views', ''), p.get('likes', ''), p.get('comments') or '—',
           p.get('shares') or '—', p.get('saves', ''), p.get('pf', ''),
           f"{p.get('cr', '')}%" if p.get('cr') else '']
    return [header, row]


def draft_narrative(master):
    d28 = master.get('overview_by_period', {}).get('d28', {})
    aud = master.get('audience_by_period', {}).get('d28', {})
    age = aud.get('age', {})
    top_age = max(age, key=age.get) if age else ''
    result = (f"直近28日で動画視聴{d28.get('video_views','')}（{d28.get('video_views_pct','')}）、"
              f"プロフィールアクセス{d28.get('pf_views','')}（{d28.get('pf_views_pct','')}）、"
              f"フォロワー{master.get('account',{}).get('followers_total','')}と認知指標が伸長。【要レビュー】")
    return {
        "goal": "採用応募につながるブランド認知の最大化。動画視聴とプロフィール来訪を伸ばす。【要レビュー】",
        "result": result,
        "reflection": "認知系指標が前回比で伸長。上位投稿の型を勝ち筋として横展開する。【要レビュー】",
        "current_issue": "バズが一部の大型企画に依存し、再現性のある型が確立できていない。【要レビュー】",
        "next_action": "勝ち筋フォーマットのシリーズ化と、冒頭2秒の結論提示・保存導線の標準化。【要レビュー】",
        "current_issue2": f"主要視聴層は{top_age}。ターゲット層とのギャップを点検する必要がある。【要レビュー】",
        "next_action2": "問いかけ型CTAでコメントを誘発し、ターゲット層向けテーマを増やす。【要レビュー】",
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--master', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--client', required=True)
    ap.add_argument('--ym', required=True, help='例: 2026年6月')
    ap.add_argument('--data-date', default='', help='例: 2026年6月3日')
    ap.add_argument('--account-name', default='')
    ap.add_argument('--handle', default='')
    ap.add_argument('--period', default='', help='運用期間 例: 2025年6月〜2026年5月')
    ap.add_argument('--months', type=int, default=6)
    args = ap.parse_args()

    master = json.load(open(args.master, encoding='utf-8'))
    posts = master.get('posts', [])
    top3 = sorted(posts, key=lambda p: (num(p.get('views')) or 0), reverse=True)[:3]

    account = build_account(master)
    account['header'] = f"アカウント分析　（データ取得日：{args.data_date}）"
    nar = draft_narrative(master)
    acct_name = args.account_name or master.get('account', {}).get('name', '')
    handle = args.handle or master.get('account', {}).get('handle', '')

    report = {
        "meta": {
            "deck_title": f"{args.client}_{args.ym}_分析レポート",
            "client": args.client, "report_ym": args.ym,
            "author": "株式会社LET マーケティング", "created": f"{args.ym}作成",
        },
        "summary": {
            "basic_info": f"アカウント名　『{acct_name}』@{handle}\n運用期間（{args.period}）\n運用目的　採用応募の獲得 / ブランド認知 / フォロワー増加",
            "goal": nar["goal"], "result": nar["result"],
        },
        "account": account,
        "posts": {
            "header_monthly": f"投稿分析　（データ取得期間：{args.period}）",
            "header_popular": f"伸びた投稿分析　（データ取得期間：{args.period}）",
            "monthly_table": build_monthly(posts, args.months),
            "popular_table1": top_table(top3[0]) if len(top3) > 0 else [],
            "popular_table2": top_table(top3[1]) if len(top3) > 1 else [],
            "popular_table3": top_table(top3[2]) if len(top3) > 2 else [],
        },
        "highlighted_posts": [
            {"header": f"投稿日：{p['date']}　テーマ：{p.get('theme','')}",
             "eval": f"再生{p.get('views','')}・リーチ{p.get('reach','')}・PF閲覧{p.get('pf','')}・完了率{p.get('cr','')}%。【要レビュー：評価ポイントを追記】",
             "comment": "（コメントピックアップは提出前に追記）"}
            for p in top3
        ],
        "next_actions": {
            "reflection": nar["reflection"], "current_issue": nar["current_issue"],
            "next_action": nar["next_action"], "current_issue2": nar["current_issue2"],
            "next_action2": nar["next_action2"],
        },
        "images": {"cover": "", "summary": ""},
    }
    with open(args.out, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    print(f"wrote {args.out}  posts={len(posts)} months={len(report['posts']['monthly_table'])-1} top3={[p['date'] for p in top3]}")


if __name__ == '__main__':
    main()
