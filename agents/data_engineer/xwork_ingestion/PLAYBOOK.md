# 運用ノート — 関西建設業 取り込みプレイブック

このディレクトリのスクリプトを使った**建設業リード取り込み**の運用手順と、これまで実施した条件のリファレンス。

## 1. 取り込み完了状況（2026-06-12 時点）

### 建設業 / x-work.jp

| 府県 | max-pages | 取得社数 | 投入後の状態 |
|---|---|---|---|
| 大阪 | 30 | 含まれる | new+match済み |
| 京都 | 30 | 含まれる | new+match済み |
| 兵庫 | 30 | 含まれる | new+match済み |
| 滋賀 | 30 | 266 | new+match済み |
| 東京 | 12 | 93 | 初期試運転で取得 |
| 残り43府県 | - | - | **未着手** |

→ 合計 **約1,255社** を新規追加、**約1,030件** に電話番号・URL補完済み。

### 業種 = 建設, 掲載元メディア = クロスワーク のフィルタで Notion から確認可能。

---

## 2. 全国一掃の手順（残り43府県）

### 前提

```bash
cd ~/agents/agents/data_engineer/xwork_ingestion
source .venv/bin/activate
export $(grep -v '^#' .env | xargs)
caffeinate -d &  # スリープ防止（Mac）
```

### Phase 1: スクレイプ + Notion 投入

残り43府県を `--max-pages 12` で取り込み。バックグラウンド実行推奨:

```bash
nohup python run_batch.py --use-gbiz --prefectures \
  hokkaido aomori iwate miyagi akita yamagata fukushima \
  ibaraki tochigi gunma saitama chiba kanagawa niigata \
  toyama ishikawa fukui yamanashi nagano gifu shizuoka aichi mie \
  wakayama tottori shimane okayama \
  hiroshima yamaguchi tokushima kagawa ehime kochi fukuoka saga \
  nagasaki kumamoto oita miyazaki kagoshima okinawa \
  --max-pages 12 > batch_national.log 2>&1 &

# 進捗確認
tail -f batch_national.log
```

**所要時間**: 6〜10時間（夜間 / 外出中に放置）  
**新規追加見込み**: 約 **3,500社**

### Phase 2: Places API で電話・URL補完

スクレイプ完了後:

```bash
python enrich_places.py --apply --max-targets 5000 --industry 建設 --media クロスワーク
```

**所要時間**: 1〜2時間  
**補完成功率**: 電話 70% / URL 65% → 約 **2,500社** に電話番号

**コスト**: 約 $160 → GCP 新規プロジェクトの $200/月クレジット内で **無料**  
(クレジット消費しすぎたくない場合は `--max-targets 2000` などに絞って分割)

### Phase 3: A ランク付け（条件次第）

下記「3. ランク付け条件」参照。

---

## 3. ランク付け条件（見込み度合い）

スクリプトは `~/agents/scripts/notion-mark-kansai-a/` にある。

### 既に実施済み: 関西 + 従業員30名以上 → A

| 条件 | 値 |
|---|---|
| 従業員数 | >= 30 |
| 住所 | 大阪府 / 京都府 / 兵庫県 / 滋賀県 のいずれかを含む |
| 住所除外 | 東京都を含まない（東"京都府"中市の誤検出回避） |
| 設定値 | 見込み度合い = A |

**実行コマンド**:
```bash
cd ~/agents/scripts/notion-mark-kansai-a
export $(grep -v '^#' ~/agents/agents/data_engineer/xwork_ingestion/.env | xargs)

# dry-run
DRY_RUN=1 node set-kansai-a.mjs

# 本実行
node set-kansai-a.mjs
```

**冪等性**: 既に A のページはスキップ。途中で止まっても再実行で続きから処理可能。

### 今後検討候補のランク付けルール（テンプレ）

新しいランクルールを追加する場合は `set-kansai-a.mjs` を複製して `set-XXX-a.mjs` を作る。フィルタ部分を書き換えるだけ:

```javascript
const FILTER = {
  and: [
    { property: "従業員数", number: { greater_than_or_equal_to: 30 } },
    // ... 条件追加
  ],
};

const NEW_RANK = "A"; // or B, C, D
```

#### よくありそうなパターン

| パターン | フィルタ | 推奨ランク |
|---|---|---|
| 関東30名以上 | 住所contains(東京都/神奈川県/埼玉県/千葉県) + 従業員>=30 | A |
| 全国100名以上 | 従業員>=100 | A |
| 関西10〜30名 | 住所contains(関西4府県) + 10<=従業員<30 | B |
| 個人事業主 | 従業員<=1 | D |

---

## 4. 他業種の取り込み

`prefecture_cities.py` の `INDUSTRIES` には現在以下が定義:

- `construction`（建設、40職種）
- `logistics`（運輸物流、14職種）

### 運輸物流の取り込み例

```bash
python run_batch.py --industry logistics --use-gbiz --prefectures osaka kyoto hyogo shiga --max-pages 30
python enrich_places.py --apply --max-targets 2000 --industry 運輸・物流 --media クロスワーク
```

### 新しい業種を追加したい場合

1. `prefecture_cities.py` の `INDUSTRIES` に追加:
   ```python
   "manufacturing": {
       "label": "製造",
       "notion_industry": "製造",
       "occupations": MANUFACTURING_OCCUPATIONS,
   }
   ```
2. 職種リストを定義（x-work.jp の実カテゴリ名を参照）
3. dry-run で動作確認
4. 本実行

---

## 5. トラブルシューティング

### Places API が動かない
- `enrich_places.py` は **Legacy Places API** を使うので、GCP で `places-backend.googleapis.com` を有効化
- 制限: Maps Platform API Key の APIの制限に Places API（無印）を含める

### gBizINFO 補完率が低い
- x-work.jp データに法人番号が含まれていないケース → gBizINFO で引けない
- Places API が代替になる

### Notion 投入で重複が大量に発生
- `find_duplicates.py --apply` でフラグ立て
- Notion UI でフィルタ「重複確認必要 = ☑」してマージ判断

### スクレイプ途中で失敗
- `batch/construction/{pref}.json` に途中までのデータが保存されている
- `--skip-scrape` 付きで再実行すると、既存JSONを再利用して投入のみ

---

## 6. 建職バンク（kenshoku-bank.com）の取り込み

x-work.jp と並ぶ第2の建設業求人サイト。求人詳細ページに「会社概要」セクションがあり、
**会社HP・本社住所・従業員数・資本金**まで取れる（x-work.jp より詳細）。

### スクレイプ + Notion 投入

```bash
cd ~/agents/agents/data_engineer/xwork_ingestion
source .venv/bin/activate
export $(grep -v '^#' .env | xargs)

# 関西4府県 dry-run
python run_kenshoku.py --prefectures osaka kyoto hyogo shiga --dry-run

# 関西4府県 本実行
python run_kenshoku.py --prefectures osaka kyoto hyogo shiga

# 全国一掃（all で47都道府県）
python run_kenshoku.py --prefectures all
```

### Places API で電話補完

x-work.jp と同じ流れ。「建職バンク」メディアで絞る:

```bash
python enrich_places.py --apply --max-targets 2000 --industry 建設 --media 建職バンク
```

### 仕様メモ

- **URL構造**: `?jobs_search[prefecture_names]=県名&page=N`
- **検索結果**: 1ページ20件、`&page=N` でページング
- **求人詳細**: `/jobs/{ID}` で個別ページ、ここに「会社概要」セクションあり
- **電話番号**: ❌ サイト上に無し → Places API で補完
- **2段階クロール**: (1) 検索結果から求人URL収集 → (2) 各求人から会社情報抽出
- **会社デデュプ**: 会社名で重複排除（1社が複数求人を出すケースに対応）

### スケール感

| 項目 | 規模 |
|---|---|
| 全公開求人 | 約7,200件 |
| 会社単位ユニーク（推定） | 約3,000〜5,000社/全国 |
| 関西4府県（推定） | 約400〜600社の新規追加 |
| 所要時間（関西） | 2〜4時間 |
| 所要時間（全国） | 半日〜1日 |

---

## 7. 関連スクリプト一覧

| パス | 用途 |
|---|---|
| `run_batch.py` | x-work.jp の府県×職種一括スクレイプ&投入 |
| `run_kenshoku.py` | 建職バンクの府県別スクレイプ&投入 |
| `scrape_xwork.py` | x-work.jp 単発スクレイプ |
| `scrape_kenshoku.py` | 建職バンク単発スクレイプ（2段階クロール） |
| `import_to_notion.py` | JSON → Notion 重複判定込み投入（`--media` でタグ指定可） |
| `enrich_places.py` | Google Places API で電話・URL補完 |
| `enrich_phones.py` | 公式サイトクロールで電話番号抽出 |
| `enrich_urls_cse.py` | Google CSE で公式URL補完（現在GCP設定要） |
| `find_duplicates.py` | 重複検出&フラグ立て |
| `prefecture_cities.py` | 47都道府県市町村リスト + 業種職種 + 都道府県名(漢字) |
| `~/agents/scripts/notion-mark-kansai-a/set-kansai-a.mjs` | 関西30名以上をA化 |
