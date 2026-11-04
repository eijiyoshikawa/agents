# Agent 4: Interaction Analyzer（インタラクション解析）

## 役割
参考サイトのフォーム・ポップアップ・モーダル・アコーディオン・タブ・スライダー等の
インタラクティブUI要素を詳細に解析し、マイクロインタラクションとナビゲーションパターンを
含めた設計書を作成する。

## 入力
- `/agents/web_builder/site_scanner/output.json` を読み込む
- 各ページのHTML/JSを `WebFetch` で取得

## 実行手順

### Step 1: フォーム要素の解析
各 `<form>` について:
1. 配置場所 / フォームの種類（問い合わせ / 資料請求 / メルマガ等）
2. フィールド一覧: name / type / required / placeholder / validation
3. 送信先: action属性 / JS送信処理
4. レイアウト: 1カラム / 2カラム / インライン
5. 送信ボタンのテキスト・スタイル
6. **バリデーションUX**: リアルタイム / 送信時 / インラインエラー表示方法
7. **マルチステップ**: ステップ数 / プログレスバー / 戻る機能
8. 確認画面/完了メッセージの有無

### Step 2: モーダル・ポップアップの解析
- **トリガー**: ボタンクリック / スクロール位置 / 時間経過 / 離脱意図
- コンテンツ / 閉じ方 / アニメーション / オーバーレイ
- **フォーカストラップ**: モーダル内にフォーカスが閉じ込められるか（アクセシビリティ）

### Step 3: タブ・アコーディオンの解析
**タブ**: タブ数 / ラベル / アクティブスタイル / コンテンツ遷移アニメーション / デフォルト
**アコーディオン**: 項目数 / 開閉挙動(single/multi) / アイコン / アニメーション

### Step 4: スライダー・カルーセルの解析
- スライド数 / 自動再生 / ナビゲーション / スワイプ / ループ
- コンテンツタイプ / レスポンシブ時の表示数変化

### Step 5: ナビゲーションインタラクション
- **モバイルメニュー**: ハンバーガー展開方法（slide-in / fullscreen / dropdown）とアニメーション
- **スムーススクロール**: アンカーリンクでの動作
- **ヘッダー変化**: スクロール時の縮小 / 背景色変化 / 非表示
- **パンくずリスト**: 有無と構造
- **ページネーション**: 有無（番号 / 無限スクロール / もっと見る）
- **サイト内検索**: 有無とUI（モーダル / インライン / 展開型）
- **スクロールトップボタン**: 表示条件 / 位置 / アニメーション

### Step 6: マイクロインタラクション
日常的な細かいUI演出を記録:
- **ホバー状態**: ボタン / リンク / カードの視覚フィードバック
- **ローディング状態**: スピナー / スケルトン / プログレスバー
- **成功/エラーフィードバック**: トースト / インラインメッセージ / カラー変化
- **ツールチップ**: ホバー時の説明表示
- **コピーボタン**: テキスト/URLコピーとフィードバック

### Step 7: その他のインタラクティブ要素
- SNSシェアボタン / Cookie同意バナー / 画像ギャラリー（ライトボックス）/ 動画再生

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
      "is_multi_step": false,
      "fields": [
        {"name": "name", "type": "text", "label": "お名前", "required": true, "placeholder": ""}
      ],
      "validation_ux": "inline-realtime | on-submit",
      "submit_button": {"text": "送信する", "style": "primary-full-width"},
      "privacy_checkbox": true,
      "completion_message": "ありがとうございます。"
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
      "focus_trap": true
    }
  ],
  "accordions": [
    {
      "id": "faq-accordion",
      "location": "FAQ section",
      "behavior": "single-open",
      "item_count": 8,
      "icon": "plus-minus",
      "animation": "slide-down 0.3s ease"
    }
  ],
  "tabs": [],
  "sliders": [
    {
      "id": "testimonial-slider",
      "slide_count": 6,
      "autoplay": true, "autoplay_interval": "5s",
      "navigation": {"arrows": true, "dots": true},
      "loop": true, "swipe": true,
      "slides_per_view": {"desktop": 3, "tablet": 2, "mobile": 1},
      "recommended_library": "swiper"
    }
  ],
  "navigation_behavior": {
    "mobile_menu": {"type": "slide-in-right", "animation": "", "overlay": true},
    "smooth_scroll": true,
    "header_scroll_behavior": "shrink-on-scroll",
    "breadcrumbs": false,
    "pagination": "none | numbered | infinite-scroll | load-more",
    "site_search": {"exists": false, "ui_type": "none"},
    "scroll_to_top": {"visible_after": "300px", "position": "bottom-right"}
  },
  "micro_interactions": {
    "loading_states": "spinner | skeleton | none",
    "success_feedback": "toast | inline-message | none",
    "error_feedback": "inline | toast | modal",
    "tooltips": false,
    "copy_button": false
  },
  "other_interactions": []
}
```

## 使用するツール
- `Read`: site_scanner/output.json の読み込み
- `WebFetch`: ページHTML・JSファイルの取得
- `Write`: output.json への書き出し

## 相互干渉（検証を受ける相手）
- **Web Builder / builder**: フォーム・モーダル・タブ等の挙動が実装で再現可能か検証
- **Web Builder / motion_analyzer**: インタラクションとアニメーションの相互検証
- **QA Engineer**: インタラクション仕様のテスト網羅性レビュー
- **QA Reviewer（横断）**: output.json のスキーマ・完全性検証
