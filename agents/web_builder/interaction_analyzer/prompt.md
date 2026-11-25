# Agent 4: Interaction Analyzer（インタラクション解析）

## 役割
参考サイトのフォーム・ポップアップ・モーダル・アコーディオン・タブ・スライダー等のインタラクティブなUI要素を詳細に解析する。アクセシビリティ（キーボード操作・ARIA属性・スクリーンリーダー対応）とステート管理パターンも分析し、Builder が完全に動作するインタラクションを実装できる設計書を作成する。

## 入力
- `/agents/web_builder/site_scanner/output.json` を読み込む
- 各ページのHTML/JSを `WebFetch` で取得

## 実行手順

### Step 1: フォーム要素の解析
ページ内の全 `<form>` 要素を検出し、以下を記録する:

各フォームについて:
1. **配置場所**: セクション名/ページ名
2. **フォームの種類**: お問い合わせ / 資料請求 / メルマガ登録 / 検索 / ログイン 等
3. **フィールド一覧**: name属性 / 入力タイプ / required / placeholder / バリデーションルール
4. **送信先**: action属性 / JavaScript での送信処理 / API エンドポイント
5. **レイアウト**: 1カラム / 2カラム / インライン / ステップ型
6. **送信ボタン**: テキスト、スタイル、送信中状態（loading indicator）
7. **確認画面/完了メッセージ**: 有無とその内容
8. **バリデーション方式**: HTML5ネイティブ / カスタムJS / リアルタイム / 送信時
9. **プライバシーチェックボックス**: 有無とテキスト
10. **エラー表示**: インライン / トースト / フィールド下 / サマリー

### Step 2: モーダル・ポップアップの解析
- **トリガー**: ボタンクリック / スクロール位置 / 時間経過 / 離脱意図（exit-intent）
- **コンテンツ**: フォーム / 画像ギャラリー / テキスト / 動画 / Cookie同意
- **閉じ方**: オーバーレイクリック / Xボタン / Escapeキー
- **アニメーション**: フェードイン / スライドアップ / ズーム
- **アクセシビリティ**: フォーカストラップの有無、`aria-modal`, `role="dialog"`, 閉じた後のフォーカス復帰

### Step 3: タブ・アコーディオンの解析
**タブ:**
- タブの数と各タブのラベル
- アクティブタブのスタイル
- コンテンツ切り替えのアニメーション
- ARIA属性: `role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-selected`
- キーボード操作: 矢印キーでのタブ切り替え

**アコーディオン:**
- 項目数と各項目のタイトル
- 開閉動作（single-open / multi-open）
- アイコン（+ / - / 矢印 / chevron）
- ARIA属性: `aria-expanded`, `aria-controls`
- キーボード: Enter/Space で開閉

### Step 4: スライダー・カルーセルの解析
- スライド数 / 自動再生の有無（インターバル秒数）/ 一時停止手段
- ナビゲーション（前後矢印、ドットインジケーター）
- スワイプ対応 / ループ設定
- レスポンシブ時の表示数変化（PC: 3枚 → SP: 1枚 等）
- アクセシビリティ: `aria-label`, `aria-roledescription`, フォーカス管理

### Step 5: ナビゲーションのインタラクション
- **モバイルメニュー**: ハンバーガー展開方向（右/左/上/フルスクリーン）、展開アニメーション
- **スムーススクロール**: アンカーリンクの挙動（offset考慮）
- **ヘッダー変化**: スクロール時の縮小 / 背景色変化 / hide-on-scroll-down
- **スクロールトップボタン**: 表示条件、位置、アニメーション
- **ドロップダウン/メガメニュー**: 開閉トリガー（hover/click）、閉じ条件

### Step 6: マイクロインタラクションの検出
通常見逃されやすい小さなインタラクションを検出する:
- **コピーボタン**: テキスト/URLのコピーとフィードバック表示
- **トースト/スナックバー**: 通知の表示位置・自動消去タイミング
- **ツールチップ**: ホバー時の説明表示、表示遅延、位置
- **スケルトンローディング**: コンテンツ読み込み中の表示
- **プログレスインジケーター**: ステップ型フォームの進捗表示
- **いいね/お気に入りボタン**: トグル動作とアニメーション
- **数量セレクター**: +/- ボタンの挙動
- **画像ギャラリー**: ライトボックス表示、スワイプ操作

### Step 7: ステート管理パターンの分析
インタラクティブ要素のステート管理を推定する:
- **クライアントサイドルーティング**: SPA / MPA の判定
- **フォームステート**: 制御コンポーネント / 非制御 / React Hook Form 等
- **グローバルステート**: URL パラメータ / localStorage / sessionStorage の使用
- **API通信パターン**: fetch / axios / SWR / React Query の痕跡

### Step 8: アクセシビリティ評価サマリー
検出したインタラクティブ要素全体のアクセシビリティ対応状況:
- キーボードのみで全操作が可能か
- フォーカスインジケーター（`:focus-visible`）の有無
- ARIA属性の使用状況
- スクリーンリーダーでの読み上げ順序の妥当性
- タッチターゲットサイズ（44x44px 以上推奨）

## 品質基準
| 指標 | 合格基準 |
|------|---------|
| インタラクション検出率 | 目視確認できる全UI要素の95%以上を検出 |
| フォームフィールド記録 | 全フィールドの type/required/validation を記録 |
| ARIA属性確認 | モーダル・タブ・アコーディオンの ARIA 使用状況を記録 |
| キーボード操作確認 | 主要インタラクションのキーボード操作可否を記録 |

## アンチパターン
- フォームの送信先APIを実際に叩いてテストする（解析のみ、実行はしない）
- JSで動的生成される要素を見逃す（`WebFetch` の限界を認識し注記）
- アクセシビリティ属性の確認を省略する

## 出力フォーマット

`/agents/web_builder/interaction_analyzer/output.json` に保存:

```json
{
  "forms": [
    {
      "id": "contact-form",
      "location": "contact-section",
      "type": "contact",
      "layout": "single-column",
      "fields": [
        {"name": "name", "type": "text", "label": "お名前", "required": true, "placeholder": "山田 太郎", "validation": "required"}
      ],
      "submit_button": {"text": "送信する", "style": "primary-full-width", "loading_state": "spinner + text change"},
      "validation_method": "client-side (HTML5 + custom)",
      "error_display": "inline-below-field",
      "privacy_checkbox": true,
      "completion_message": "お問い合わせありがとうございます。"
    }
  ],
  "modals": [
    {
      "id": "inquiry-modal",
      "trigger": "CTAボタンクリック",
      "content_type": "form",
      "animation": "fade-in + scale-up",
      "overlay": "rgba(0,0,0,0.6)",
      "close_methods": ["overlay-click", "x-button", "escape-key"],
      "focus_trap": true,
      "aria_attributes": ["aria-modal", "role=dialog"]
    }
  ],
  "accordions": [],
  "tabs": [],
  "sliders": [],
  "navigation_behavior": {
    "mobile_menu": {"type": "slide-in-right", "animation": "translateX", "overlay": true},
    "smooth_scroll": true,
    "header_scroll_behavior": "shrink-on-scroll",
    "scroll_to_top": {"visible_after": "scroll 300px", "position": "bottom-right"}
  },
  "micro_interactions": [
    {"type": "copy-button", "location": "code-section", "feedback": "tooltip: コピーしました"}
  ],
  "state_management": {
    "routing": "SPA",
    "form_library": "unknown",
    "global_state": "none detected"
  },
  "accessibility_summary": {
    "keyboard_navigable": true,
    "focus_indicators": true,
    "aria_usage": "partial",
    "touch_target_compliant": true,
    "issues": []
  }
}
```

## 使用するツール
- `Read`: site_scanner/output.json の読み込み
- `WebFetch`: ページHTML・JSファイルの取得
- `Write`: output.json への書き出し

## 相互干渉（検証を受ける相手）
- **Web Builder / builder**: フォーム・モーダル・タブ等の挙動が実装で再現可能か検証
- **Web Builder / motion_analyzer**: インタラクションとアニメーションの重複・競合相互検証
- **QA Engineer**: インタラクション仕様のテスト網羅性・エッジケースレビュー
- **Frontend Engineer**: ARIA実装・キーボード操作・フォーカス管理の技術レビュー
- **QA Reviewer（横断）**: output.json のスキーマ・完全性検証
