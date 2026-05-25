# LET 7日スプリントカレンダー

> 適用: `playbooks/recruit_ads/07_runbook/sprint_7day.md`
> 起点: 2026-06-03（水）配信開始想定
> 担当: PM = Project Manager Agent / Marketing / Ad Ops / Content Creator / Data Analyst

## 1. 開始前準備（D-7〜D-1）

| Day | 日付 | アクション | 担当 | 完了条件 |
|---|---|---|---|---|
| D-7 | 5/26(火) | LP に GTM + Pixel(Meta/TikTok/LINE) 設置 | Engineer | Test Events で発火確認 |
| D-7 | 5/26(火) | 法人セールス JD 受領・反映 | ユーザー → Marketing | 詳細要件確定 |
| D-6 | 5/27(水) | Legal 募集要項チェック | Legal | NG表現なし確認 |
| D-5 | 5/28(木) | 媒体アカウント開設・権限付与 | Ad Ops + ユーザー | Meta BM / TikTok / LINE Ads アクセス可 |
| D-5 | 5/28(木) | Sheets `ad_daily_raw` / `applications` / `creative_scores` 初期化 | Data Analyst | テンプレ列定義完了 |
| D-4 | 5/29(金) | 初回CRTV 12本制作 | Content Creator | 命名規則準拠、納品 |
| D-3 | 5/30(土) | Looker Studio ダッシュボード初期構築 | Data Analyst | 5ページ雛形完成 |
| D-2 | 6/01(月) | CRTV最終チェック・UTM 確認 | Marketing + Ad Ops | 全Adに正しいUTM |
| D-1 | 6/02(火) | キャンペーン構築・配信予約 | Ad Ops | 媒体管理画面で予約完了 |

## 2. Sprint 1（6/03〜6/09）

| Day | 日付 | 曜日 | アクション | 主担当 |
|---|---|---|---|---|
| **D2** | 6/03 | 水 | **配信開始** 19:00目安 | Ad Ops |
| D3 | 6/04 | 木 | 触らない（学習期1日目）、午前にPixel発火確認 | Ad Ops |
| D4 | 6/05 | 金 | 触らない、Hook率の初動だけメモ | Ad Ops |
| D5 | 6/06 | 土 | Hook率/CTR 中間スクリーニング、明らかな負け弾停止可 | Ad Ops |
| D6 | 6/08 | 月 | 中間レビュー、勝ち弾予算+20%まで | Ad Ops + Marketing |
| **D7** | 6/09 | 火朝 | **配信終了 → Day0 レトロ** | 全員 |

### Sprint 1 のレトロ（6/09 火曜 14:00-15:30）
1. 結果集計 → `experiment_register.csv` 更新（EXP-20260525-001/002/003）
2. CRTV別 Hook率/CTR/CVR ランキング
3. 訴求軸 H1〜H6 のうち、勝ち負け方向性確定
4. インスティンクト追加・更新（`learnings/instincts/recruit_ads.json`）
5. Sprint 2 仮説起票（3-5本）

## 3. Sprint 2〜4 のループ

```
火 Day0 : 前週レトロ + 新仮説起票 + CRTV ブリーフ作成
水 Day1 : CRTV 6-12本制作 + 媒体投入
水夜    : 配信開始
木金土日: モニタ・低パフォ停止
月      : 中間レビュー
火朝    : 配信終了 → 次サイクル
```

| Sprint | 配信期間 | 主目的 |
|---|---|---|
| Sprint 1 | 6/03-6/09 | 訴求軸4種+α の方向性把握 |
| Sprint 2 | 6/10-6/16 | Sprint 1勝ち軸を深堀り、新訴求3本追加 |
| Sprint 3 | 6/17-6/23 | 勝ち訴求 × 別形式 で形式の効き目検証 |
| Sprint 4 | 6/24-6/30 | 月総括、初インスティンクト confidence 0.5+ 確定 |

## 4. 役割分担（毎週固定）

| 担当 | 火 (Day0) | 水 (Day1+配信) | 木-月 | 火朝 |
|---|---|---|---|---|
| Marketing | レトロ・仮説起票 | CRTVレビュー | - | レトロ参加 |
| Ad Operations | データエクスポート | 媒体投入・公開 | モニタ・予算調整 | データ集計 |
| Content Creator | ブリーフ受領 | **6-12本制作** | 次サイクル準備 | - |
| Data Analyst | - | - | ダッシュボード更新 | 統計検定・学び抽出 |
| Engineer | - | LP/タグ確認 | LP CVR レビュー | - |
| PM | 全体管理 | 進捗確認 | - | レトロファシリ |

## 5. KPI 月次目標

| KPI | 月次目標 |
|---|---|
| 投入CRTV総数 | 30-40本 |
| Hook率 平均（TikTok） | 12%+ |
| CTR 平均（Meta） | 1.2%+ |
| 応募数 | 5-10件 |
| 有効応募数 | 3-7件 |
| 採用数 | 0.3-1名 |
| **学び**: confidence 0.5+ インスティンクト | 月3-5件 |

## 6. ブロッカー時の判断

| 症状 | アクション |
|---|---|
| LP Pixel未設置で配信日になった | 配信延期（CV計測不能なら回す意味薄い） |
| CRTV制作が間に合わない | 既存CRTV継続 + 新規3本に絞る、来週リカバリ |
| 媒体アカウントトラブル（停止等） | Legal レビュー再実施、別アカウント検討 |
| 応募ジャンク多発（有効応募率<30%） | LP メッセージマッチ、ターゲ年齢上げる |
| 全CRTV CTR低迷 | フック1秒目の見直し、競合広告ライブラリ調査 |

## 7. 卒業条件（→ 隔週/月次サイクル）

- 訴求軸ごと confidence 0.7+ が3軸以上
- 月予算が10万円超に拡張
- 応募ジャンク率 < 30% 安定
- CPH レンジが想定内に収束

→ Phase 2 検証フェーズへ、または `06_formulas/formulas/F-osaka-city-eigyo.md` 起票検討
