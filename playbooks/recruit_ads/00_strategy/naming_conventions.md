# 命名規則（Naming Conventions）

**全媒体・全実験で共通の命名を必須とする**。命名が揃わない限り、横断集計も方程式化も不可能。

## 1. 命名の階層（4層）

```
Campaign  ─ 媒体側のキャンペーン階層
Ad Set    ─ ターゲティング × 予算配分
Ad        ─ クリエイティブ単位
UTM       ─ LP側で受け取る識別子
```

各階層で `_` を区切り文字、`-` をサブ区切り文字とする。

## 2. Campaign 命名

```
{MEDIA}_{INDUSTRY}_{AREA}_{OBJECTIVE}_{YYYYMM}_{SEQ}
```

| 要素 | 値の例 | 説明 |
|---|---|---|
| MEDIA | `meta` / `tt` / `line` / `yt` / `x` | 媒体コード |
| INDUSTRY | `kaigo` / `kensetsu` / `inshoku` / `it` / `eigyo` | 業種コード（後述） |
| AREA | `tokyo23` / `chiba-north` / `saitama-south` / `osaka-city` | エリアコード |
| OBJECTIVE | `cv` / `traffic` / `reach` / `engagement` | 配信目的 |
| YYYYMM | `202606` | 開始年月 |
| SEQ | `001` | 月内通し番号 |

例: `meta_kaigo_saitama-south_cv_202606_003`

## 3. Ad Set 命名

```
{TARGETING}_{HOOK}_{AUDIENCE-SIZE}
```

| 要素 | 値の例 |
|---|---|
| TARGETING | `radius-15km-funabashi` / `area-tokyo23` / `lookalike-1pct` / `interest-childcare` |
| HOOK | `salary` / `nokin-nashi`（夜勤なし）/ `mikeiken-ok`（未経験OK）/ `nakama`（仲間） |
| AUDIENCE-SIZE | `s` / `m` / `l`（小: 〜30万 / 中: 30-100万 / 大: 100万+） |

例: `radius-15km-funabashi_nokin-nashi_m`

## 4. Ad 命名

```
{CRTV-FORMAT}_{CRTV-ID}_{COPY-VARIANT}
```

| 要素 | 値の例 |
|---|---|
| CRTV-FORMAT | `ugc` / `interview` / `montage` / `static` / `carousel` / `text` |
| CRTV-ID | `c001` / `c002`（クリエイティブ通し番号） |
| COPY-VARIANT | `a` / `b` / `c`（A/Bテストのバリアント） |

例: `ugc_c014_b`

## 5. UTM 命名

LP側のGA4/CRMで受ける。**全媒体で必ず付与する**。

| パラメータ | 値 | 例 |
|---|---|---|
| `utm_source` | 媒体コード | `meta` |
| `utm_medium` | 配信種別 | `paid-social` / `paid-search` |
| `utm_campaign` | Campaign名と一致 | `meta_kaigo_saitama-south_cv_202606_003` |
| `utm_content` | Ad名と一致 | `ugc_c014_b` |
| `utm_term` | Ad Set名と一致（任意） | `radius-15km-funabashi_nokin-nashi_m` |
| `exp_id` | 実験ID（独自） | `EXP-20260601-003` |
| `lp_id` | LPバリアント | `lp-kaigo-v2` |

## 6. 業種コード（INDUSTRY）

| コード | 業種 | コード | 業種 |
|---|---|---|---|
| `kaigo` | 介護 | `inshoku` | 飲食 |
| `kensetsu` | 建設・職人 | `hotel` | 宿泊 |
| `unyu` | 運輸・配送 | `eigyo` | 営業 |
| `seizo` | 製造・工場 | `it` | IT・エンジニア |
| `keibi` | 警備 | `eigyo-fudo` | 不動産営業 |
| `bigyo` | 美容・理容 | `jimu` | 事務・バックオフィス |
| `hoiku` | 保育 | `medical` | 医療 |

新業種は本ファイルに追記してから利用。

## 7. エリアコード（AREA）

```
{都道府県}-{方角 or 都市名}
```

例:
- `tokyo23` / `tokyo-west`（多摩西部）
- `kanagawa-east`（横浜・川崎）/ `kanagawa-west`（湘南・西湘）
- `saitama-south` / `saitama-north`
- `chiba-north` / `chiba-south`
- `osaka-city` / `osaka-south`

半径指定: `radius-{km}km-{駅 or 市}` 形式で Ad Set 側に記載。

## 8. 実験ID（EXP-ID）

```
EXP-{YYYYMMDD}-{通し番号3桁}
```

例: `EXP-20260601-003`

`05_experiments/experiment_register.csv` で発行・管理。**重複は厳禁**。

## 9. 命名規則チェックリスト

新規キャンペーン作成時、以下を満たすこと:

- [ ] Campaign名が `{MEDIA}_{INDUSTRY}_{AREA}_{OBJECTIVE}_{YYYYMM}_{SEQ}` 形式
- [ ] Ad Set名が `{TARGETING}_{HOOK}_{AUDIENCE-SIZE}` 形式
- [ ] Ad名が `{CRTV-FORMAT}_{CRTV-ID}_{COPY-VARIANT}` 形式
- [ ] UTM全パラメータ付与（特に `exp_id`）
- [ ] 業種・エリアコードが本ファイルに登録済み
- [ ] EXP-ID が register.csv に発行済み
