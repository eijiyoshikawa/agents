#!/usr/bin/env python3
"""フリー素材（Pexels / Pixabay）から記事用画像を一括ダウンロードする。

- articles_image_brief.csv の各行（記事）について、検索キーワードで画像を検索し、
  `アイキャッチ_ファイル名`（例: 001-...-hero.jpg）で images/ に保存する。
- 商用利用可・クレジット不要のソース（Pexels / Pixabay）のみを対象とする。
- 依存ライブラリなし（標準ライブラリの urllib のみ）。
- APIキーは環境変数から読む（ハードコード禁止・リポジトリに残さない）:
    Pexels  → 環境変数 PEXELS_API_KEY
    Pixabay → 環境変数 PIXABAY_API_KEY

使い方の例:
    export PEXELS_API_KEY=xxxxx
    python3 download_images.py --source pexels                 # アイキャッチ1枚/記事
    python3 download_images.py --source pixabay --per-article 2 # 1記事2枚
    python3 download_images.py --source pexels --lang ja        # 日本語KWで検索
    python3 download_images.py --source pexels --only 001,002   # 指定記事だけ

注意:
- 取得した画像のライセンスは Pexels/Pixabay の規約（商用可・クレジット不要）に基づくが、
  最終的な利用可否は各自で確認すること。人物・ロゴが目立つ画像は手動で差し替える。
- ダウンロード結果は images/_download_log.csv に記録（撮影者・元URLも保存）。
"""
import argparse
import csv
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
BRIEF_CSV = os.path.join(HERE, "articles_image_brief.csv")
OUT_DIR = os.path.join(HERE, "images")
LOG_CSV = os.path.join(OUT_DIR, "_download_log.csv")
# 全記事で同じ写真が重複しないよう、使用済み画像ID（"source:id"）を記録する
USED_IDS_FILE = os.path.join(OUT_DIR, "_used_ids.txt")

PEXELS_ENDPOINT = "https://api.pexels.com/v1/search"
PIXABAY_ENDPOINT = "https://pixabay.com/api/"


def trim_query(q, max_words):
    """検索ヒット率を上げるため、キーワードを先頭 max_words 語に絞る。"""
    words = q.replace("/", " ").split()
    return " ".join(words[:max_words])


def http_get_json(url, headers=None):
    req = urllib.request.Request(url, headers=headers or {})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))


def search_pexels(query, key, per_page):
    """Pexels で検索し、[(画像ID, 画像URL, 撮影者, 参照URL), ...] を返す。"""
    params = urllib.parse.urlencode({
        "query": query, "per_page": min(max(per_page, 3), 80),
        "orientation": "landscape",
    })
    data = http_get_json(f"{PEXELS_ENDPOINT}?{params}",
                         headers={"Authorization": key})
    out = []
    for p in data.get("photos", []):
        src = p.get("src", {})
        img = src.get("large2x") or src.get("large") or src.get("original")
        if img:
            out.append((f"pexels:{p.get('id')}", img,
                       p.get("photographer", ""), p.get("url", "")))
    return out


def search_pixabay(query, key, per_page, lang):
    params = urllib.parse.urlencode({
        "key": key, "q": query, "image_type": "photo",
        "safesearch": "true", "per_page": min(max(per_page, 3), 100),
        "orientation": "horizontal", "lang": lang,
    })
    data = http_get_json(f"{PIXABAY_ENDPOINT}?{params}")
    out = []
    for h in data.get("hits", []):
        img = h.get("largeImageURL") or h.get("webformatURL")
        if img:
            out.append((f"pixabay:{h.get('id')}", img,
                       h.get("user", ""), h.get("pageURL", "")))
    return out


def load_used_ids():
    """過去に取得済みの画像ID集合を読み込む。"""
    s = set()
    if os.path.exists(USED_IDS_FILE):
        with open(USED_IDS_FILE, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    s.add(line)
    return s


def save_used_ids(s):
    os.makedirs(OUT_DIR, exist_ok=True)
    with open(USED_IDS_FILE, "w", encoding="utf-8") as f:
        for x in sorted(s):
            f.write(x + "\n")


def seed_used_from_log(used):
    """既存の _download_log.csv から、取得済み画像IDを推定して used に加える。
    （以前のダウンロード分との重複も避けるため）"""
    if not os.path.exists(LOG_CSV):
        return
    with open(LOG_CSV, encoding="utf-8-sig") as f:
        for r in csv.DictReader(f):
            src = (r.get("ソース") or "").strip()
            url = (r.get("元URL") or "").strip().rstrip("/")
            m = re.search(r"(\d+)$", url)
            if src and m:
                used.add(f"{src}:{m.group(1)}")


def download(url, dest):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=60) as r, open(dest, "wb") as f:
        f.write(r.read())


def main():
    ap = argparse.ArgumentParser(description="フリー素材一括ダウンロード")
    ap.add_argument("--source", choices=["pexels", "pixabay"], required=True)
    ap.add_argument("--per-article", type=int, default=1,
                   help="1記事あたりの取得枚数（既定1=アイキャッチのみ）")
    ap.add_argument("--lang", choices=["en", "ja"], default="en",
                   help="検索キーワードの言語（既定en）")
    ap.add_argument("--max-words", type=int, default=4,
                   help="検索語の最大単語数（ヒット率調整・既定4）")
    ap.add_argument("--sleep", type=float, default=1.5,
                   help="APIレート制限対策の待機秒（既定1.5）")
    ap.add_argument("--only", default="",
                   help="対象記事番号をカンマ区切りで指定（例 001,002）")
    ap.add_argument("--body-only", action="store_true",
                   help="アイキャッチ(hero)を作らず、本文用に -01.jpg から保存する")
    ap.add_argument("--overwrite", action="store_true",
                   help="既存ファイルも上書きする")
    args = ap.parse_args()

    env_name = "PEXELS_API_KEY" if args.source == "pexels" else "PIXABAY_API_KEY"
    key = os.environ.get(env_name)
    if not key:
        print(f"エラー: 環境変数 {env_name} が未設定です。\n"
              f"  export {env_name}=あなたのAPIキー  を実行してください。",
              file=sys.stderr)
        return 2

    if not os.path.exists(BRIEF_CSV):
        print(f"エラー: {BRIEF_CSV} がありません。"
              f"先に generate_image_brief.py を実行してください。", file=sys.stderr)
        return 2

    os.makedirs(OUT_DIR, exist_ok=True)
    only = {x.strip() for x in args.only.split(",") if x.strip()}
    kw_col = "検索キーワード(日)" if args.lang == "ja" else "検索キーワード(英)"

    log_rows = []
    ok = miss = skip = 0
    used_ids = load_used_ids()
    seed_used_from_log(used_ids)   # 既存DL分のIDも重複回避に含める

    with open(BRIEF_CSV, encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))

    # 重複回避のため候補は多めに取得し、使用済みを除外して選ぶ
    cand = min(80, max(args.per_article * 8, 30))

    for row in rows:
        idn = row["記事番号"]
        if only and idn not in only:
            continue
        base = row["アイキャッチ_ファイル名"]            # 001-...-hero.jpg
        stem = base.rsplit("-hero", 1)[0]                # 001-...
        query = trim_query(row[kw_col], args.max_words)

        # この記事で必要なファイル名を先に確定する
        targets = []
        for i in range(args.per_article):
            if args.body_only:
                targets.append(f"{stem}-{i + 1:02d}.jpg")   # 本文用: -01, -02...
            else:
                targets.append(base if i == 0 else f"{stem}-{i:02d}.jpg")

        # 全ファイルが既にあるなら、API検索もせずスキップ（再実行時の429回避）
        if not args.overwrite and all(
                os.path.exists(os.path.join(OUT_DIR, t)) for t in targets):
            print(f"  [{idn}] スキップ(全既存): {', '.join(targets)}")
            skip += len(targets)
            continue

        try:
            if args.source == "pexels":
                hits = search_pexels(query, key, cand)
            else:
                hits = search_pixabay(query, key, cand, args.lang)
        except Exception as e:
            print(f"  [{idn}] 検索失敗: {e}", file=sys.stderr)
            miss += 1
            time.sleep(args.sleep)
            continue

        # まだ使っていない写真だけを候補にする（他記事・既存DLとの重複回避）
        avail = [h for h in hits if h[0] not in used_ids]
        ai = 0

        for i, fname in enumerate(targets):
            dest = os.path.join(OUT_DIR, fname)

            if os.path.exists(dest) and not args.overwrite:
                print(f"  [{idn}] スキップ(既存): {fname}")
                skip += 1
                continue

            # 重複しない次の写真を選ぶ
            if ai >= len(avail):
                print(f"  [{idn}] 重複しない候補が不足: {fname} は未取得"
                      f"（KWを調整して再実行してください）")
                miss += 1
                continue
            uid, img_url, author, ref = avail[ai]
            ai += 1

            try:
                download(img_url, dest)
                used_ids.add(uid)          # 取得した写真IDを記録（以後は再利用しない）
                print(f"  [{idn}] 保存: {fname}")
                ok += 1
                log_rows.append({
                    "記事番号": idn, "ファイル名": fname, "検索語": query,
                    "ソース": args.source, "撮影者": author, "元URL": ref,
                })
            except Exception as e:
                print(f"  [{idn}] DL失敗 {fname}: {e}", file=sys.stderr)
                miss += 1
            time.sleep(args.sleep)

    save_used_ids(used_ids)   # 使用済みIDを保存（次回実行でも重複を回避）

    # ログ追記（撮影者・元URLの記録。クレジット不要だが記録として残す）
    write_header = not os.path.exists(LOG_CSV)
    with open(LOG_CSV, "a", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["記事番号", "ファイル名", "検索語",
                                          "ソース", "撮影者", "元URL"])
        if write_header:
            w.writeheader()
        w.writerows(log_rows)

    print(f"\n完了: 保存 {ok} / スキップ {skip} / 失敗・ヒットなし {miss}")
    print(f"保存先: {OUT_DIR}/  ログ: {LOG_CSV}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
