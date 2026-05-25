# Meta（Facebook / Instagram）広告ガイド

採用広告における Meta の使い方。CLAUDE.md の事業領域「SNSマーケティング」と整合。

## 1. 強みと弱み

**強み**
- ターゲティング精度が高い（年齢・地域・興味関心・カスタムオーディエンス）
- Advantage+ オーディエンス（自動拡張）の学習が早い
- 30-50代リーチが厚く、介護・建設・運輸・営業・事務に強い
- LP・フォーム・Lead Ads（インスタント応募）の選択肢が広い

**弱み**
- CPM が年々上昇（2026年時点で前年比 +15-25%）
- iOS14.5 以降のCV計測精度低下 → CAPI 必須
- 若年層リーチは TikTok に劣る

## 2. 推奨キャンペーン構成

### A. 通常Web応募（LP誘導）

```
Campaign: Sales目的 / Optimize for Conversions
  └ Ad Set: 1〜3本（訴求軸で分離）
        ├ ターゲティング: Advantage+ オーディエンス + エリア絞り
        ├ 配置: Advantage+ 配置（全面任せ）
        ├ 予算: 日予算 3,000〜10,000円/Ad Set
        └ 入札: 自動入札（学習期: CPA上限なし → 学習後に上限）
              Ad: 4〜6本（CRTVフォーマット混在）
```

### B. Lead Ads（インスタント応募フォーム）

```
Campaign: Leads目的
  └ Ad Set: 同上
        └ Ad: Lead Form 添付
              ├ Higher Intent オプション ON（質の高い応募）
              ├ 質問: 3〜5問（氏名・電話・希望勤務地・希望シフト等）
              └ 自動連携: Zapier / CRM API で即時取り込み
```

→ Lead Ads は応募ハードル低い分、有効応募率が低下しがち。**有効応募CPA で評価**。

## 3. ターゲティングのコツ

| 軸 | 設定例 |
|---|---|
| 年齢 | 業種に応じて調整（介護: 25-55 / 建設: 20-45 / 飲食: 18-35） |
| 性別 | 原則絞らない（職業安定法上、性別限定は要件次第） |
| エリア | 半径 5-20km（駅周辺 or 事業所周辺） |
| 興味関心 | Advantage+ 任せ。手動絞りは Phase1探索のみ |
| 除外 | 既存応募者・採用済 → カスタムオーディエンス除外 |
| 類似 | 既存応募者の1〜3% Lookalike（500件以上のシードが必要） |

## 4. クリエイティブ仕様

| 形式 | 仕様 | 用途 |
|---|---|---|
| Reels動画 | 9:16 / 15-60秒 / 字幕必須 | メイン（CTR最高） |
| Feed動画 | 1:1 or 4:5 / 15-30秒 | Reels未対応世代 |
| Feed静止画 | 1:1 / 1200x1200以上 | 学習補助・CPM抑制 |
| カルーセル | 1:1 × 3-5枚 | 仕事内容・福利厚生の説明 |
| Stories | 9:16 / 15秒 | 補助的 |

**必須**: 1秒目に強フック（「未経験OK」「日払い」「夜勤なし」等）+ 字幕焼き込み。

## 5. 学習期間とKPI評価のタイミング

| 期間 | 状態 | 取るべきアクション |
|---|---|---|
| Day 0-3 | 学習期 | 触らない（停止・予算変更NG） |
| Day 4-7 | 学習完了 | 初期CPA確認・低パフォーマンスAd停止 |
| Day 8-14 | 安定期 | Ad Set単位の予算配分調整 |
| Day 15+ | 疲弊監視 | CTR/Frequency 監視、新CRTV投入 |

**Frequency 3.0 超え + CTR 低下** → クリエイティブ疲弊。新弾投入。

## 6. CAPI（Conversions API）

iOS / トラッキング規制で Pixel だけでは精度不足。**CAPI 必須**。

- Meta Conversions API Gateway を Vercel / Cloud Run にデプロイ
- LP のサーバ側で `Lead` / `CompleteRegistration` イベントを送信
- イベントID重複排除（`event_id` で Pixel と紐付け）
- ハッシュ化済PII送付（メール・電話）→ マッチ率向上

詳細: `04_measurement/tracking_setup.md`

## 7. よくある失敗

- [ ] Ad Set を細分化しすぎて学習しない（最低 50CV/週/Ad Set）
- [ ] 学習期に頻繁にCRTVや予算をいじって学習リセット
- [ ] 静止画だけで配信（動画ないとリーチ伸びない）
- [ ] LPにPixel入れただけでCAPI未設定（計測過小評価で予算配分ミス）
- [ ] 募集要項に「明るい人」等の主観表現（職業安定法で問題化）

## 8. チェックリスト（配信前）

- [ ] Meta Business Manager / Ads Manager にアクセス可
- [ ] Pixel + CAPI 設定済（Test Eventsで送信確認）
- [ ] カスタムCV「Lead」「CompleteRegistration」設定済
- [ ] 命名規則（`00_strategy/naming_conventions.md`）準拠
- [ ] Legal が募集要項チェック済
- [ ] LP / フォームの動作確認（実機）
- [ ] EXP-ID を register.csv に発行済
