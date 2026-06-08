import json, collections

src = json.load(open('scripts/report-generator/samples/REVECAREERAGENCY_2026-06.extraction_master.json'))
posts = src['posts']

def num(s):
    if s is None: return None
    s = str(s).replace(',', '').strip()
    if s == '': return None
    try:
        if s.endswith('M'): return int(float(s[:-1]) * 1_000_000)
        if s.endswith('K'): return int(float(s[:-1]) * 1_000)
        return float(s) if '.' in s else int(s)
    except: return None

# monthly aggregation
months = collections.OrderedDict()
for p in posts:
    ym = p['date'][:7]
    months.setdefault(ym, []).append(p)

def avg(vals):
    vals = [v for v in vals if v is not None]
    return round(sum(vals)/len(vals)) if vals else None

monthly_rows = []
for ym, ps in months.items():
    monthly_rows.append({
        'ym': ym, 'count': len(ps),
        'views': avg([num(p['views']) for p in ps]),
        'reach': avg([num(p['reach']) for p in ps]),
        'likes': avg([num(p['likes']) for p in ps]),
        'saves': avg([num(p['saves']) for p in ps]),
        'pf':    avg([num(p['pf']) for p in ps]),
        'avg_s': avg([num(p['avg_s']) for p in ps]),
        'cr':    avg([num(p['cr']) for p in ps]),
    })

def fmt(n): return '' if n is None else f"{n:,}"
def label(ym):
    y,m = ym.split('-'); return f"{y}/{int(m)}月"

# slide8: recent 6 months
recent = monthly_rows[-6:]
header8 = ['月','投稿数','平均再生','平均リーチ','平均いいね','平均保存','平均PF閲覧','平均視聴秒','平均完了率']
table8 = [header8] + [[label(r['ym']), str(r['count']), fmt(r['views']), fmt(r['reach']),
                       fmt(r['likes']), fmt(r['saves']), fmt(r['pf']),
                       ('' if r['avg_s'] is None else f"{r['avg_s']}s"),
                       ('' if r['cr'] is None else f"{r['cr']}%")] for r in recent]

# top3 by views
top3 = sorted(posts, key=lambda p: (num(p['views']) or 0), reverse=True)[:3]
header9 = ['投稿日','視聴回数','いいね','コメント','シェア','保存','PF閲覧','完了率']
def trow(p): return [p['date'], p['views'], p['likes'], p['comments'] or '—',
                     p['shares'] or '—', p['saves'], p['pf'], f"{p['cr']}%"]

report = {
  "meta": {
    "deck_title": "REVECAREERAGENCY_2026年6月_分析レポート",
    "client": "REVECAREERAGENCY", "report_ym": "2026年6月",
    "author": "株式会社LET マーケティング", "created": "2026年6月7日 作成"
  },
  "summary": {
    "basic_info": "アカウント名　『黒崎社長就職エージェント』@kurosaki_shacho\n運用期間（2025年6月〜2026年5月）\n運用目的　採用応募の獲得 / ブランド認知 / フォロワー増加",
    "goal": "採用応募につながるブランド認知の最大化。動画視聴とプロフィール来訪を伸ばし、フォロワー基盤を拡大する。",
    "result": "直近28日でフォロワー7,790（前回比+117%）、動画視聴203,451（+139%）、プロフィールアクセス7,212（+135%）と認知指標が大幅伸長。社長密着・ドッキリ系が牽引し、年間では再生390万・新規フォロワー8,474を獲得。"
  },
  "account": {
    "header": "アカウント分析　（データ取得日：2026年6月3日）",
    "followers_now": "7,790", "followers_change": "+117.35",
    "video_views": "203,451", "video_views_pct": "+139.21",
    "pf_access": "7,212", "pf_access_pct": "+135.07",
    "likes": "2,828", "likes_pct": "+17.30",
    "comments": "79", "shares": "35", "shares_pct": "-20.18"
  },
  "posts": {
    "monthly_table": table8,
    "popular_table1": [header9, trow(top3[0])],
    "popular_table2": [header9, trow(top3[1])],
    "popular_table3": [header9, trow(top3[2])]
  },
  "highlighted_posts": [
    {"header": f"投稿日：{top3[0]['date']}　テーマ：{top3[0]['theme']}",
     "eval": f"再生{top3[0]['views']}・リーチ{top3[0]['reach']}・PF閲覧{top3[0]['pf']}・完了率{top3[0]['cr']}%。社長を巻き込むドッキリ企画が圧倒的な拡散とプロフィール来訪を生んだ。",
     "comment": "（コメントピックアップは提出前に追記）"},
    {"header": f"投稿日：{top3[1]['date']}　テーマ：{top3[1]['theme']}",
     "eval": f"再生{top3[1]['views']}・リーチ{top3[1]['reach']}・PF閲覧{top3[1]['pf']}・平均視聴{top3[1]['avg_s']}s。クイズ形式で長尺でも最後まで視聴され、保存{top3[1]['saves']}件と高い。",
     "comment": "（コメントピックアップは提出前に追記）"},
    {"header": f"投稿日：{top3[2]['date']}　テーマ：{top3[2]['theme']}",
     "eval": f"再生{top3[2]['views']}・リーチ{top3[2]['reach']}・PF閲覧{top3[2]['pf']}・平均視聴{top3[2]['avg_s']}s。社長の素顔が見える密着フォーマットが採用検討層に深く刺さった。",
     "comment": "（コメントピックアップは提出前に追記）"}
  ],
  "next_actions": {
    "reflection": "認知系指標（視聴・PFアクセス・フォロワー）は前回比+117〜139%と大幅伸長。ドッキリ／社長密着／クイズの3フォーマットが勝ち筋と確認。",
    "current_issue": "シェアが前回比-20%。バズは一部の大型企画に依存し、共有を生む型が再現できていない。",
    "next_action": "社長密着・ドッキリのシリーズ化で再現性を確保。冒頭2秒の結論提示と保存導線を全投稿に標準化する。",
    "current_issue2": "母数に対しコメントが少なく双方向性が弱い。45-54歳中心で若手採用層(25-34)の比率が低い。",
    "next_action2": "問いかけ型CTAでコメントを誘発。若手向けテーマ（選考Tips・キャリア相談）を増やし25-34層を取り込む。"
  },
  "images": {"cover": "", "summary": ""}
}

open('scripts/report-generator/samples/REVECAREERAGENCY_2026-06.report_data.json','w').write(
    json.dumps(report, ensure_ascii=False, indent=2))
print("== monthly (recent6) ==")
for r in table8: print(r)
print("== top3 ==")
for p in top3: print(p['date'], p['theme'], p['views'])
print("OK")
