#!/usr/bin/env python3
"""
report_data.json 自動QAチェックリスト（提出前の抜け漏れ・誤読検知）

HANDOFF.md「次の一手 2.」の実装。生成済み report_data.json を検査し、
「@ハンドル未設定」「累計投稿数が空」「桁誤読/符号反転の疑い」「提出前TODO残り」を
[ERROR] / [要確認] / [TODO] の3段階で列挙する。推定・自動修正は行わない。

使い方:
  python3 qa_check.py path/to/report_data.json          # 人間向けチェックリスト
  python3 qa_check.py path/to/report_data.json --json   # CI/後工程向けJSON

終了コード: ERROR あり=2 / 要確認のみ=1 / 全通過=0
依存: 標準ライブラリのみ。
"""
import argparse, json, sys

PCT_ABS_LIMIT = 5000        # 前回比がこれ(%)を超えたら桁誤読疑い
COUNT_ABS_LIMIT = 100_000_000  # 実数値がこれを超えたら桁誤読疑い
TODO_MARKERS = ('【要レビュー', '【要確認', '提出前に追記')


def num(s):
    """'1,234' '+117.35' '1.1M' '45K' → float。空/'—'/解釈不能は None"""
    if s is None:
        return None
    s = str(s).replace(',', '').replace('%', '').replace('+', '').strip()
    if s in ('', '—', '-'):
        return None
    try:
        if s.endswith('M'):
            return float(s[:-1]) * 1_000_000
        if s.endswith('K'):
            return float(s[:-1]) * 1_000
        return float(s)
    except ValueError:
        return None


def sign(s):
    """符号付き文字列の符号。'+' → 1 / '-' → -1 / 不明 → 0"""
    s = str(s or '').strip()
    return 1 if s.startswith('+') else (-1 if s.startswith('-') else 0)


class Findings:
    def __init__(self):
        self.items = []  # {level, path, message}

    def add(self, level, path, message):
        self.items.append({'level': level, 'path': path, 'message': message})

    def error(self, path, msg):
        self.add('ERROR', path, msg)

    def check(self, path, msg):
        self.add('要確認', path, msg)

    def todo(self, path, msg):
        self.add('TODO', path, msg)

    def count(self, level):
        return sum(1 for i in self.items if i['level'] == level)


def check_meta(d, f):
    meta = d.get('meta', {})
    for key in ('deck_title', 'client', 'report_ym'):
        if not str(meta.get(key, '')).strip():
            f.error(f'meta.{key}', '必須メタ情報が空。デッキ特定・命名に必要')
    if not str(meta.get('created', '')).strip():
        f.check('meta.created', '作成日が空。表紙の作成日が埋まらない')


def check_handle(d, f):
    basic = d.get('summary', {}).get('basic_info', '')
    if '@' not in basic:
        f.check('summary.basic_info',
                '@ハンドル未設定（スクショ未記載の場合は提出前にクライアント確認）')


def check_account_counts(acct, f):
    for key, label in (('posts_total', '累計投稿数'), ('post_freq', '投稿頻度(月間)')):
        v = str(acct.get(key, '')).strip()
        if v in ('', '0', '00'):
            f.check(f'account.{key}',
                    f'{label}が未充填（"{v}"）。データに無い場合は提出前に手動補完')
    for key in ('followers_now', 'video_views', 'pf_access', 'likes'):
        v = acct.get(key)
        if v is not None and str(v).strip() and num(v) is None:
            f.error(f'account.{key}', f'数値として解釈不能: "{v}"')


def check_account_sanity(acct, f):
    start, now = num(acct.get('followers_start')), num(acct.get('followers_now'))
    chg = acct.get('followers_change', '')
    if start is not None and now is not None and sign(chg) != 0:
        if sign(chg) > 0 and now < start:
            f.check('account.followers_change',
                    f'符号反転疑い: 前回比 "{chg}" は増だがフォロワーは {start:,.0f}→{now:,.0f} と減少')
        if sign(chg) < 0 and now > start:
            f.check('account.followers_change',
                    f'符号反転疑い: 前回比 "{chg}" は減だがフォロワーは {start:,.0f}→{now:,.0f} と増加')
    for key, v in acct.items():
        n = num(v)
        if n is None:
            continue
        if key.endswith(('_pct', '_change')) or key == 'followers_change':
            if abs(n) > PCT_ABS_LIMIT:
                f.check(f'account.{key}', f'桁誤読疑い: 前回比 {n:,.1f}% は異常に大きい（元スクショ再確認）')
        elif abs(n) > COUNT_ABS_LIMIT:
            f.check(f'account.{key}', f'桁誤読疑い: {n:,.0f} は異常に大きい（元スクショ再確認）')


def check_tables(d, f):
    posts = d.get('posts', {})
    monthly = posts.get('monthly_table', [])
    if len(monthly) < 2:
        f.check('posts.monthly_table', '月次テーブルにデータ行が無い')
    for name in ('monthly_table', 'popular_table1', 'popular_table2', 'popular_table3'):
        table = posts.get(name, [])
        if not table:
            f.check(f'posts.{name}', 'テーブルが空（伸びた投稿が3本未満なら想定内）')
            continue
        width = len(table[0])
        for i, row in enumerate(table[1:], start=1):
            if len(row) != width:
                f.error(f'posts.{name}[{i}]',
                        f'列数不一致: ヘッダ{width}列に対し{len(row)}列。レンダラの表崩れ原因')


def check_todos(d, f):
    def walk(node, path):
        if isinstance(node, dict):
            for k, v in node.items():
                walk(v, f'{path}.{k}' if path else k)
        elif isinstance(node, list):
            for i, v in enumerate(node):
                walk(v, f'{path}[{i}]')
        elif isinstance(node, str):
            for marker in TODO_MARKERS:
                if marker in node:
                    f.todo(path, f'提出前タスク: 「{marker}…」が残っている')
                    break
    walk(d, '')


def run_checks(d):
    f = Findings()
    for section in ('meta', 'summary', 'account', 'posts', 'next_actions'):
        if section not in d:
            f.error(section, '必須セクションが欠落')
    check_meta(d, f)
    check_handle(d, f)
    check_account_counts(d.get('account', {}), f)
    check_account_sanity(d.get('account', {}), f)
    check_tables(d, f)
    check_todos(d, f)
    return f


def print_report(f, path):
    icons = {'ERROR': '❌ ERROR', '要確認': '⚠️  要確認', 'TODO': '📝 TODO'}
    print(f'=== QAチェック: {path} ===')
    if not f.items:
        print('✅ 全チェック通過。提出前の手作業（コメント抜粋・画像貼付）のみ確認してください。')
        return
    for level in ('ERROR', '要確認', 'TODO'):
        rows = [i for i in f.items if i['level'] == level]
        if not rows:
            continue
        print(f'\n[{icons[level]}] {len(rows)}件')
        for r in rows:
            print(f'  - {r["path"]}: {r["message"]}')
    print(f'\n合計: ERROR {f.count("ERROR")} / 要確認 {f.count("要確認")} / TODO {f.count("TODO")}')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('data', help='report_data.json のパス')
    ap.add_argument('--json', action='store_true', help='JSONで出力（CI/後工程向け）')
    args = ap.parse_args()

    d = json.load(open(args.data, encoding='utf-8'))
    f = run_checks(d)

    if args.json:
        print(json.dumps({'file': args.data, 'findings': f.items,
                          'errors': f.count('ERROR'), 'warnings': f.count('要確認'),
                          'todos': f.count('TODO')}, ensure_ascii=False, indent=2))
    else:
        print_report(f, args.data)
    sys.exit(2 if f.count('ERROR') else (1 if f.count('要確認') else 0))


if __name__ == '__main__':
    main()
