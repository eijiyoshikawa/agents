# 計測タグ設定（Pixel / Tag / CAPI / GA4）

**計測が壊れていれば全実験が無効**。配信前にテスト送信で動作確認必須。

## 1. 計測アーキテクチャ

```
[Ad Click]
    ↓ utm + click_id (fbclid / ttclid / li_fat_id)
[LP Page]
    ├─→ Meta Pixel ──┐
    ├─→ TikTok Pixel ─┤
    ├─→ LINE Tag ────┤    （クライアントサイド）
    └─→ GA4 ─────────┘
    ↓
[Form Submit]
    ↓ event_id を発行（UUID）
[Server Backend]
    ├─→ Meta Conversions API ──┐
    ├─→ TikTok Events API ─────┤  （サーバーサイド、PIIハッシュ化）
    ├─→ LINE Conversion API ───┤
    └─→ GA4 Measurement Protocol ┘
    ↓
[CRM / Sheet]
    ├ apply, valid_apply, interview, hire, retained_90d を記録
    └ EXP-ID, utm_* を保持して media 側に「Offline Conversions」アップロード
```

## 2. 設定すべきイベント

| イベント | 発火タイミング | クライアント | サーバー |
|---|---|---|---|
| `PageView` | LP表示 | 全タグ | - |
| `ViewContent` | FV表示完了 | 全タグ | - |
| `ScrollDepth_50` | 50%スクロール | GA4 | - |
| `InitiateCheckout` 相当（`FormStart`） | フォーム初フォーカス | 全タグ | - |
| `Lead` | フォーム送信完了 | 全タグ | 全CAPI |
| `ValidLead`（カスタム） | CRM側で有効判定 | - | Offline Conversion Upload |
| `Interview` | 面接実施 | - | Offline Conversion Upload |
| `Hire` | 採用決定 | - | Offline Conversion Upload |
| `RetainedHire` | 90日定着 | - | Offline Conversion Upload |

**Offline Conversions** を Meta / TikTok に流すことで、媒体の最適化が「採用」「定着」に最適化される（応募止まりにならない）。これが効く。

## 3. Meta 設定手順

### 3.1 Pixel
1. Business Manager > Events Manager > Pixel作成
2. LP に snippet 設置（GTM経由推奨）
3. カスタムCV: `Lead`（フォーム送信URL or イベント）

### 3.2 CAPI
1. Conversions API Gateway を Cloud Run / Vercel Functions にデプロイ
2. サーバーから `Lead` 送信（access_token必要）
3. `event_id` を Pixel と共通発行（dedup）
4. PII（email/phone）は SHA-256 ハッシュ化
5. Test Events タブで送信確認、Match Quality 6.0+ 目標

### 3.3 Offline Conversions
- CRMから日次でCSV/API送信
- `Hire` / `RetainedHire` を Lead と同じ`event_id`で送信
- 媒体側でアトリビューション → 最適化対象に組み込み

## 4. TikTok 設定手順

### 4.1 Pixel
1. Ads Manager > Assets > Events
2. LP に snippet（GTM経由）
3. `CompletePayment` を `Lead` に流用 or カスタムイベント

### 4.2 Events API
1. Access Token 取得
2. サーバーから `event_source: web` で `Lead` 送信
3. `event_id` 共通発行（dedup）
4. PII ハッシュ化

### 4.3 注意点
- iOS の SAN（Self Attributing Network）レポートと CAPI 数字は乖離する
- 14日CV window を基本

## 5. LINE 設定手順

### 5.1 LINE Tag
1. LINE Ads Platform > 計測タグ作成
2. LP設置 + カスタムCV「応募完了」設定

### 5.2 Conversion API（提供順次）
- 2026年時点で順次拡大、利用可能なら設定

### 5.3 友だち追加経由
- LINE公式アカウントWebhook → CRM連携
- `friend_added` → `applied` をCRM側で繋ぐ
- 媒体側にはCV送信（Lead相当）

## 6. GA4 設定

### イベント
- 標準: `page_view`, `scroll`, `form_start`, `form_submit`
- カスタム: `valid_lead`, `interview`, `hire`

### カスタムディメンション
- `exp_id`, `utm_campaign`, `utm_content`, `utm_term`, `lp_id`

### Measurement Protocol（サーバー）
- フォーム送信時にサーバから `lead` イベント送信（信頼性高い）

## 7. CRM 側で必須の項目

| 項目 | 用途 |
|---|---|
| `exp_id` | 実験単位の集計 |
| `utm_*` 全部 | アトリビューション |
| `fbclid` / `ttclid` / `li_fat_id` | Offline Conversion Upload |
| `event_id` | media側 dedup |
| `lp_id` | LP別評価 |
| `applied_at` / `valid_at` / `interviewed_at` / `hired_at` / `retained_90d_at` | ファネル時系列 |

## 8. テスト手順（配信前必須）

1. Meta Test Events / TikTok Test Events に自端末から送信確認
2. GA4 DebugView でリアルタイム確認
3. CRM 側で全UTM・clickIDが入って来るか確認
4. Offline Conversion アップロードのドライラン
5. dedup（同event_idがclient/server両方で記録されないか）確認

## 9. よくある事故

- [ ] Pixel あるが CAPI なし → iOSで応募過小評価、入札歪み
- [ ] event_id 未設定 → dedup効かず重複カウント
- [ ] PII 非ハッシュ送信 → 規約違反
- [ ] CRM に utm_term 入らない → Ad Set別評価不能
- [ ] Offline Conversion未連携 → 応募ジャンクに最適化されたまま

## 10. 集計シートの最低構造

```
EXP-ID | media | campaign | adset | ad | utm_content | lp_id |
imp | click | session | form_start | apply | valid_apply |
interview | hire | retained_90d | cost | days_running
```

これを `05_experiments/experiment_register.csv` の派生として持つ（実集計はBQ/Sheets推奨）。
