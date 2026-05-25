# UTM パラメータ規約

`00_strategy/naming_conventions.md` の UTM 部分の運用ルール詳細。**全媒体・全LPで必ず付与**。

## 1. 必須パラメータ

| キー | 値 | 例 |
|---|---|---|
| `utm_source` | 媒体コード | `meta` / `tt` / `line` / `yt` / `x` |
| `utm_medium` | 配信種別 | `paid-social` / `paid-search` |
| `utm_campaign` | Campaign名と完全一致 | `meta_kaigo_saitama-south_cv_202606_003` |
| `utm_content` | Ad名と完全一致 | `ugc_c014_b` |
| `utm_term` | Ad Set名と完全一致 | `radius-15km-funabashi_nokin-nashi_m` |
| `exp_id` | 実験ID | `EXP-20260601-003` |
| `lp_id` | LPバリアントID | `lp-kaigo-v2-short` |

## 2. URLサンプル

```
https://example.com/recruit/kaigo
  ?utm_source=meta
  &utm_medium=paid-social
  &utm_campaign=meta_kaigo_saitama-south_cv_202606_003
  &utm_content=ugc_c014_b
  &utm_term=radius-15km-funabashi_nokin-nashi_m
  &exp_id=EXP-20260601-003
  &lp_id=lp-kaigo-v2-short
```

## 3. ルール

- 値は小文字・半角英数・`-` のみ（`_` はキー間区切り用、値内は`-`）
- 日本語・記号NG
- 媒体側でURLパラメータマクロを使ってAd名・AdSet名を自動展開する
  - Meta: `{{campaign.name}}` / `{{adset.name}}` / `{{ad.name}}`
  - TikTok: `__CAMPAIGN_NAME__` / `__AID_NAME__` / `__CID_NAME__`
  - LINE: 媒体仕様準拠
- `click_id` (fbclid/ttclid/li_fat_id) は媒体が自動付与 → LP側で保存

## 4. LP側の取り扱い

- すべてのUTMをCookieまたはlocalStorageに保存（有効期限30日）
- フォーム送信時にhidden fieldで全UTM + click_id を送信
- CRMに保存（後段のOffline Conversion Uploadで使用）

## 5. 媒体側マクロ展開例（Meta）

Ad設定の「URLパラメータ」欄:
```
utm_source=meta&utm_medium=paid-social&utm_campaign={{campaign.name}}&utm_content={{ad.name}}&utm_term={{adset.name}}&exp_id={{adset.name}}&lp_id={{ad.name}}
```
→ `exp_id` / `lp_id` は別途 URL の末尾に手書き or 命名にIDを埋め込む。

実用上は**ベースURLに `exp_id` / `lp_id` を手で書き、UTM 3点はマクロ展開**。

## 6. アンチパターン

- [ ] UTMキーをキャメルケースにする（`utmContent` → 媒体が認識しない）
- [ ] 日本語値（`utm_content=応募ボタン` → 文字化け）
- [ ] スペース含む値（半角_or_ - のみ）
- [ ] `utm_term`を省略（Ad Set別分析不能）
- [ ] `exp_id` 漏れ（実験集計不能）
- [ ] 媒体側マクロ未使用で手書き（タイポ多発）

## 7. 集計時のクエリ例（GA4 / BQ）

```sql
SELECT
  utm_campaign, utm_content, exp_id, lp_id,
  COUNT(DISTINCT session_id) AS sessions,
  SUM(CASE WHEN event_name = 'form_start' THEN 1 ELSE 0 END) AS form_starts,
  SUM(CASE WHEN event_name = 'lead' THEN 1 ELSE 0 END) AS leads
FROM `project.dataset.events_*`
WHERE _TABLE_SUFFIX BETWEEN '20260601' AND '20260630'
  AND exp_id = 'EXP-20260601-003'
GROUP BY 1,2,3,4
```

## 8. URLビルダー

実装簡略化のため、社内URLビルダーを `app/tools/utm-builder/page.tsx` 等で用意（Engineer 担当）。
コピペでフォームから生成、UTM規約違反を機械的にブロック。
