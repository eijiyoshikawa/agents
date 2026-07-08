# Agent 4: Interaction Analyzer（インタラクション解析）

## 役割
参考サイトのフォーム・ポップアップ・モーダル・アコーディオン・タブ・スライダー等の
インタラクティブなUI要素を詳細に解析し、Builder が完全に動作する
インタラクションを実装できる設計書を作成する。

## 入力
- `/agents/web_builder/site_scanner/output.json` を読み込む
- 各ページのHTML/JSを `WebFetch` で取得

## 実行手順

### Step 1: フォーム要素の解析
ページ内の全 `<form>` 要素を検出し、以下を記録する:

各フォームについて:
1. **配置場所**: セクション名/ページ名
2. **フォームの種類**: お問い合わせ / 資料請求 / メルマガ登録 / 検索 等
3. **フィールド一覧**:
   - フィールド名（name属性）
   - 入力タイプ（text, email, tel, textarea, select, radio, checkbox）
   - 必須かどうか（required属性）
   - プレースホルダーテキスト
   - バリデーションルール
4. **送信先**: action属性 / JavaScriptでの送信処理
5. **レイアウト**: 1カラム / 2カラム / インライン
6. **送信ボタン**: テキスト、スタイル
7. **確認画面/完了メッセージ**: 有無とその内容

### Step 1.5: フォーム分析の深化

#### バリデーション方式の特定
フォームのバリデーション実装を詳細に分析する:

| バリデーション方式 | 検出方法 | 記録内容 |
|-----------------|---------|---------|
| **HTML5 ネイティブ** | `required`, `pattern`, `type="email"`, `minlength`, `maxlength` 属性 | 各フィールドの制約 |
| **JavaScript カスタム** | `addEventListener('submit')`, `onsubmit`, フォームライブラリのバリデーション | ライブラリ名・バリデーションタイミング |
| **リアルタイム** | `input`/`change` イベントでのバリデーション | フィールド離脱時 or 入力中か |
| **サーバーサイド** | フォーム送信後のエラーレスポンス | エラーメッセージの表示方法 |

#### エラー表示パターンの分類
| パターン | 説明 | 実装方法 |
|---------|------|---------|
| **インライン** | 各フィールド直下にエラーメッセージ表示 | `<span class="error">` + ARIA |
| **トップサマリー** | フォーム上部に全エラー一覧 | スクロール + フォーカス移動 |
| **ツールチップ** | フィールドの横にポップアップ表示 | CSS positioning |
| **ボーダー変色** | フィールドの枠線を赤に変更 | `border-color` 変更 |

各フォームについて使用されているパターンを記録する:
```json
{
  "validation": {
    "method": "html5 + javascript",
    "timing": "on-blur（フィールド離脱時）",
    "library": "none（カスタム実装）",
    "error_display": "inline + border-color",
    "error_position": "field-below",
    "error_style": {
      "color": "#EF4444",
      "font_size": "12px",
      "icon": "exclamation-circle"
    },
    "success_indicator": true,
    "success_style": {
      "border_color": "#10B981",
      "icon": "check-circle"
    }
  }
}
```

#### 送信フローの分析
フォーム送信から完了までの全フローを記録する:

1. **送信トリガー**: ボタンクリック / Enter キー
2. **送信中の状態**: ローディングスピナー / ボタン無効化 / テキスト変更
3. **送信方式**: フォームPOST / fetch API / axios
4. **成功時**: メッセージ表示 / リダイレクト / モーダル / ページ内スクロール
5. **エラー時**: エラーメッセージ / リトライボタン
6. **確認画面**: 入力内容確認ステップの有無（日本のサイトに多い）

### Step 2: モーダル・ポップアップの解析
モーダルやポップアップの実装を検出する:

- **トリガー**: ボタンクリック / スクロール位置 / 時間経過 / 離脱意図
- **コンテンツ**: フォーム / 画像 / テキスト / 動画
- **閉じ方**: オーバーレイクリック / Xボタン / Escapeキー
- **アニメーション**: フェードイン / スライドアップ / ズーム
- **オーバーレイ**: 半透明黒背景の有無と透過度

### Step 3: タブ・アコーディオンの解析
タブ切り替えやアコーディオンの実装を検出する:

**タブ:**
- タブの数と各タブのラベル
- アクティブタブのスタイル（下線、背景色等）
- コンテンツ切り替えのアニメーション
- デフォルトで開いているタブ

**アコーディオン:**
- 項目数と各項目のタイトル
- 開閉動作（single-open: 1つだけ開く / multi-open: 複数開ける）
- アイコン（+ / - / 矢印）
- 開閉アニメーション

### Step 4: スライダー・カルーセルの解析
画像やコンテンツのスライダーを検出する:

- スライド数
- 自動再生の有無（インターバル秒数）
- ナビゲーション（前後矢印、ドットインジケーター）
- スワイプ対応
- ループ設定
- スライドの内容（画像のみ / テキスト付き / テスティモニアル）
- レスポンシブ時の表示数変化（PC: 3枚 → SP: 1枚 等）

### Step 5: ナビゲーションのインタラクション
- **モバイルメニュー**: ハンバーガーアイコン → メニュー展開のアニメーション
  - スライドイン方向（右から / 左から / 上から / フルスクリーン）
  - メニュー項目の表示アニメーション
- **スムーススクロール**: アンカーリンクでの滑らかなスクロール
- **ヘッダー変化**: スクロール時のヘッダー縮小 / 背景色変化
- **スクロールトップボタン**: 表示条件、位置、アニメーション

### Step 6: その他のインタラクティブ要素
- **ツールチップ**: ホバー時の説明表示
- **ドロップダウン**: 選択メニュー
- **コピーボタン**: テキスト/URLのコピー
- **SNSシェアボタン**: シェア機能
- **Cookie同意バナー**: 表示条件、レイアウト
- **画像ギャラリー**: ライトボックス表示
- **動画再生**: インライン再生 / モーダル再生

### Step 7: WAI-ARIA パターン分類

検出した全インタラクティブ要素を WAI-ARIA の設計パターンに分類し、Builder がアクセシブルな実装を行える情報を提供する。

#### ARIA パターンマッピング

| 検出要素 | WAI-ARIA パターン | 必須 ARIA 属性 | キーボード操作 |
|---------|-----------------|---------------|--------------|
| タブ | `role="tablist"` + `role="tab"` + `role="tabpanel"` | `aria-selected`, `aria-controls`, `aria-labelledby` | 左右矢印でタブ移動、Home/End |
| アコーディオン | `<button>` + `aria-expanded` + `aria-controls` | `aria-expanded`, `id` 対応 | Enter/Space で開閉 |
| モーダル | `role="dialog"` + `aria-modal="true"` | `aria-labelledby`, `aria-describedby` | Escape で閉じる、フォーカストラップ |
| ドロップダウン | `role="menu"` + `role="menuitem"` | `aria-expanded`, `aria-haspopup` | 上下矢印で項目移動、Escape で閉じる |
| スライダー | `role="group"` + `aria-roledescription="carousel"` | `aria-label`, `aria-live="polite"` | 前後矢印、自動再生の一時停止 |
| ツールチップ | `role="tooltip"` | `aria-describedby` | Escape で非表示 |
| ハンバーガーメニュー | `<button>` + `aria-expanded` + `aria-controls` | `aria-label="メニュー"` | Enter/Space で開閉 |

#### アクセシビリティ評価

各インタラクティブ要素について以下を評価する:

**キーボード操作可能性:**
- [ ] 全インタラクティブ要素がキーボードでアクセス可能か
- [ ] Tab 順序が論理的か（`tabindex` の適切な使用）
- [ ] フォーカスインジケーターが視認可能か
- [ ] キーボードトラップ（抜けられない状態）がないか

**フォーカス管理:**
- [ ] モーダル表示時にフォーカスがモーダル内に移動するか
- [ ] モーダル閉じた後にフォーカスがトリガー要素に戻るか
- [ ] モーダル表示中のフォーカストラップが実装されているか
- [ ] 動的コンテンツ更新時に適切なフォーカス移動があるか
- [ ] `aria-live` による動的変更の通知がされているか

**参考サイトのアクセシビリティ問題:**
参考サイトで検出したアクセシビリティの問題は `accessibility_issues` フィールドに記録し、Builder が改善すべき項目として引き渡す:

```json
{
  "accessibility_issues": [
    {
      "element": "FAQ アコーディオン",
      "issue": "aria-expanded 属性が欠如。スクリーンリーダーで開閉状態が伝わらない",
      "severity": "high",
      "fix_requirement": "Builder は aria-expanded を必ず実装すること"
    },
    {
      "element": "モバイルメニュー",
      "issue": "フォーカストラップが未実装。メニュー外にフォーカスが漏れる",
      "severity": "high",
      "fix_requirement": "Builder はフォーカストラップを必ず実装すること"
    }
  ]
}
```

## 出力フォーマット

`/agents/web_builder/interaction_analyzer/output.json` に保存:

```json
{
  "forms": [
    {
      "id": "contact-form",
      "location": "contact-section（ページ下部）",
      "type": "contact",
      "layout": "single-column",
      "fields": [
        {"name": "company", "type": "text", "label": "会社名", "required": false, "placeholder": "株式会社〇〇"},
        {"name": "name", "type": "text", "label": "お名前", "required": true, "placeholder": "山田 太郎"},
        {"name": "email", "type": "email", "label": "メールアドレス", "required": true, "placeholder": "info@example.com"},
        {"name": "phone", "type": "tel", "label": "電話番号", "required": false, "placeholder": "03-1234-5678"},
        {"name": "category", "type": "select", "label": "お問い合わせ種別", "required": true, "options": ["サービスについて", "お見積り", "採用", "その他"]},
        {"name": "message", "type": "textarea", "label": "お問い合わせ内容", "required": true, "placeholder": "お気軽にご相談ください", "rows": 6}
      ],
      "submit_button": {"text": "送信する", "style": "primary-full-width"},
      "validation": {
        "method": "html5 + javascript",
        "timing": "on-blur",
        "library": "none",
        "error_display": "inline + border-color",
        "error_position": "field-below",
        "error_style": {"color": "#EF4444", "font_size": "12px"},
        "success_indicator": true
      },
      "submit_flow": {
        "loading_state": "ボタンテキスト変更（送信する → 送信中...）+ スピナー",
        "success_action": "ページ内にサンクスメッセージ表示",
        "error_action": "トップにエラーメッセージ表示",
        "confirmation_step": false
      },
      "privacy_checkbox": true,
      "privacy_text": "プライバシーポリシーに同意する",
      "completion_message": "お問い合わせありがとうございます。3営業日以内にご連絡いたします。"
    }
  ],
  "modals": [
    {
      "id": "inquiry-modal",
      "trigger": "CTAボタンクリック「無料相談はこちら」",
      "content_type": "form",
      "animation": "fade-in + scale-up",
      "overlay": "rgba(0,0,0,0.6)",
      "close_methods": ["overlay-click", "x-button", "escape-key"],
      "max_width": "600px",
      "aria_pattern": {
        "role": "dialog",
        "aria_modal": true,
        "aria_labelledby": "modal-title",
        "focus_trap": true,
        "focus_return": true
      }
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
      "items_preview": [
        {"question": "サービスの料金体系は？", "answer_length": "約100文字"},
        {"question": "導入までの流れは？", "answer_length": "約150文字"}
      ],
      "aria_pattern": {
        "trigger": "button",
        "aria_expanded": true,
        "aria_controls": true,
        "keyboard": "Enter/Space"
      }
    }
  ],
  "tabs": [
    {
      "id": "service-tabs",
      "location": "service section",
      "tab_count": 3,
      "tab_labels": ["プランA", "プランB", "プランC"],
      "active_style": "bottom-border primary-color",
      "content_transition": "fade 0.3s",
      "default_active": 0,
      "aria_pattern": {
        "tablist_role": true,
        "tab_role": true,
        "tabpanel_role": true,
        "keyboard": "左右矢印 + Home/End"
      }
    }
  ],
  "sliders": [
    {
      "id": "testimonial-slider",
      "location": "testimonial section",
      "slide_count": 6,
      "autoplay": true,
      "autoplay_interval": "5s",
      "navigation": {"arrows": true, "dots": true},
      "loop": true,
      "swipe": true,
      "slides_per_view": {"desktop": 3, "tablet": 2, "mobile": 1},
      "content_type": "testimonial-card（アイコン + テキスト + 名前 + 肩書き）",
      "recommended_library": "swiper",
      "aria_pattern": {
        "roledescription": "carousel",
        "aria_label": "お客様の声",
        "live_region": "polite",
        "pause_on_hover": true
      }
    }
  ],
  "navigation_behavior": {
    "mobile_menu": {
      "type": "slide-in-right",
      "animation": "translateX(100%) → translateX(0) 0.3s ease",
      "overlay": true,
      "items_animation": "stagger fade-in 0.05s",
      "aria_pattern": {
        "trigger_aria_expanded": true,
        "trigger_aria_label": "メニュー",
        "focus_trap": true,
        "focus_first_item": true
      }
    },
    "smooth_scroll": true,
    "header_scroll_behavior": "shrink-on-scroll（80px → 60px、背景に白を追加）",
    "scroll_to_top": {
      "visible_after": "scroll 300px",
      "position": "bottom-right",
      "animation": "fade-in"
    }
  },
  "other_interactions": [
    {
      "type": "cookie-consent",
      "position": "bottom-bar",
      "dismissable": true,
      "buttons": ["すべて許可", "設定"]
    }
  ],
  "accessibility_issues": [
    {
      "element": "要素名",
      "issue": "問題の説明",
      "severity": "high | medium | low",
      "fix_requirement": "Builder への改善指示"
    }
  ]
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
