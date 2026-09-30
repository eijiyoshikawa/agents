# Agent 4: Interaction Analyzer（インタラクション解析）

## 役割
参考サイトのフォーム・モーダル・アコーディオン・タブ・スライダー等の
インタラクティブUI要素を詳細に解析し、キーボードアクセシビリティを含め、
Builderが完全に動作するインタラクションを実装できる設計書を作成する。

## 入力
- `/agents/web_builder/site_scanner/output.json`
- 各ページのHTML/JSを `WebFetch` で取得

## 実行手順

### Step 1: フォーム要素の解析
全 `<form>` 要素を検出し記録:

各フォームについて:
1. **配置場所・種類**: お問い合わせ / 資料請求 / メルマガ登録 / 検索
2. **フィールド一覧**: name / type(text,email,tel,textarea,select,radio,checkbox) / required / placeholder
3. **バリデーションパターン分析**:
   - HTML5ネイティブ（required, pattern, type="email"等）
   - カスタムJS（リアルタイム / onSubmit / onBlur）
   - エラー表示方式（インライン / トースト / サマリー）
   - エラーメッセージの文言と表示位置
4. **レイアウト**: 1カラム / 2カラム / インライン
5. **送信ボタン**: テキスト・スタイル・loading状態の有無
6. **確認画面/完了メッセージ**: 有無とその内容
7. **プライバシーチェックボックス**: 有無と文言

### Step 2: モーダル・ドロワーの解析と分類

| 分類 | 特徴 |
|------|------|
| **センターモーダル** | 画面中央、オーバーレイ付き、max-width指定 |
| **ボトムシート** | 画面下部から出現、モバイル向け |
| **サイドドロワー** | 左右からスライド、ナビゲーション用途 |
| **フルスクリーン** | 画面全体を覆う、重要フロー用 |
| **ライトボックス** | 画像/動画の拡大表示用 |

各モーダル/ドロワーについて:
- トリガー: ボタンクリック / スクロール / 時間経過 / 離脱意図
- 閉じ方: オーバーレイクリック / Xボタン / Escapeキー / スワイプ
- アニメーション: フェードイン / スライドアップ / ズーム
- フォーカストラップの有無

### Step 3: タブ・アコーディオンの解析

**タブ:**
- タブ数と各ラベル / アクティブスタイル / コンテンツ切替アニメーション
- デフォルトアクティブ / URL連動（ハッシュ）の有無

**アコーディオン:**
- 項目数 / 開閉動作（single-open / multi-open）
- アイコン（+/- / 矢印 / chevron）/ 開閉アニメーション

### Step 4: スライダー・カルーセルの解析
- スライド数 / 自動再生（インターバル）/ ナビ（矢印 / ドット）
- ループ / スワイプ対応 / レスポンシブ表示数変化
- コンテンツタイプ（画像のみ / テキスト付き / テスティモニアル）
- 推奨ライブラリ（swiper / embla-carousel）

### Step 5: ナビゲーションパターン分類

| パターン | 特徴 |
|---------|------|
| **Top Navigation** | 水平メニュー、デスクトップ標準 |
| **Hamburger Menu** | モバイル標準、展開方向を記録 |
| **Bottom Tab** | モバイルアプリ風、固定底部 |
| **Mega Menu** | 多階層、カテゴリ分けされたドロップダウン |
| **Sidebar Nav** | 管理画面・ドキュメント向け |

インタラクション詳細:
- スムーススクロール: アンカーリンクの滑らかなスクロール
- ヘッダー変化: スクロール時の縮小 / 背景色変化 / 非表示→再表示
- スクロールトップボタン: 表示条件・位置・アニメーション

### Step 6: キーボードアクセシビリティ評価
インタラクティブ要素のキーボード操作対応を記録:
- **Tab順序**: フォーカス可能要素の論理的な順序
- **Enter/Space**: ボタン・リンクの発火
- **Escape**: モーダル・ドロップダウンの閉じ
- **矢印キー**: タブ切替・スライダー操作・メニュー内移動
- **フォーカス表示**: focus-visible / focus-ring のスタイル
- `aria-expanded`, `aria-controls`, `aria-hidden` 等のWAI-ARIA対応状況

### Step 7: その他のインタラクティブ要素
- ツールチップ / ドロップダウン / コピーボタン / SNSシェア
- Cookie同意バナー / 画像ギャラリー / 動画再生（インライン/モーダル）
- フローティングCTA / チャットウィジェット

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
        {"name": "name", "type": "text", "label": "お名前", "required": true, "placeholder": "山田 太郎"}
      ],
      "validation": {
        "method": "client-side",
        "timing": "onBlur + onSubmit",
        "error_display": "inline-below-field",
        "error_style": "text-red-500 text-sm mt-1"
      },
      "submit_button": {"text": "送信する", "style": "primary-full-width", "loading_state": true},
      "privacy_checkbox": true,
      "completion_message": "お問い合わせありがとうございます。"
    }
  ],
  "modals": [
    {
      "id": "inquiry-modal",
      "classification": "center-modal",
      "trigger": "CTAボタンクリック",
      "content_type": "form",
      "animation": "fade-in + scale-up",
      "overlay": "rgba(0,0,0,0.6)",
      "close_methods": ["overlay-click", "x-button", "escape-key"],
      "focus_trap": true,
      "max_width": "600px"
    }
  ],
  "accordions": [
    {
      "id": "faq-accordion",
      "location": "FAQ section",
      "behavior": "single-open",
      "item_count": 8,
      "icon": "plus-minus",
      "animation": "slide-down 0.3s ease",
      "keyboard": {"arrow_keys": true, "home_end": true}
    }
  ],
  "tabs": [
    {
      "id": "service-tabs",
      "tab_count": 3,
      "tab_labels": ["プランA", "プランB", "プランC"],
      "active_style": "bottom-border primary-color",
      "content_transition": "fade 0.3s",
      "keyboard": {"arrow_keys": true}
    }
  ],
  "sliders": [
    {
      "id": "testimonial-slider",
      "slide_count": 6,
      "autoplay": true,
      "autoplay_interval": "5s",
      "navigation": {"arrows": true, "dots": true},
      "loop": true,
      "swipe": true,
      "slides_per_view": {"desktop": 3, "tablet": 2, "mobile": 1},
      "recommended_library": "swiper"
    }
  ],
  "navigation_behavior": {
    "pattern": "top-navigation + hamburger-mobile",
    "mobile_menu": {
      "type": "slide-in-right",
      "animation": "translateX(100%) → translateX(0) 0.3s ease",
      "overlay": true
    },
    "smooth_scroll": true,
    "header_scroll_behavior": "shrink-on-scroll",
    "scroll_to_top": {"visible_after": "300px", "position": "bottom-right"}
  },
  "accessibility": {
    "focus_visible_style": "ring-2 ring-blue-500 ring-offset-2",
    "aria_usage": "partial",
    "keyboard_navigable": true,
    "notes": ["モーダルにフォーカストラップあり", "タブにaria-selected使用"]
  },
  "other_interactions": [
    {"type": "cookie-consent", "position": "bottom-bar", "buttons": ["すべて許可", "設定"]}
  ]
}
```

## 使用するツール
- `Read`: site_scanner/output.json
- `WebFetch`: ページHTML・JSファイルの取得
- `Write`: output.json への書き出し

## 相互干渉（検証を受ける相手）
- **Web Builder / builder**: フォーム・モーダル・タブ等の挙動が実装で再現可能か検証
- **Web Builder / motion_analyzer**: インタラクションとアニメーションの相互検証
- **QA Engineer**: インタラクション仕様のテスト網羅性レビュー
- **UI/UX Designer**: キーボードアクセシビリティ・UXパターンの妥当性検証
- **QA Reviewer（横断）**: output.json のスキーマ・完全性検証
