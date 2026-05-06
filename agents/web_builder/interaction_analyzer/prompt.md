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
      "validation": "client-side (HTML5 + custom)",
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
      "items_preview": [
        {"question": "サービスの料金体系は？", "answer_length": "約100文字"},
        {"question": "導入までの流れは？", "answer_length": "約150文字"}
      ]
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
      "default_active": 0
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
      "recommended_library": "swiper"
    }
  ],
  "navigation_behavior": {
    "mobile_menu": {
      "type": "slide-in-right",
      "animation": "translateX(100%) → translateX(0) 0.3s ease",
      "overlay": true,
      "items_animation": "stagger fade-in 0.05s"
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

## フォームUX高度分析

### マルチステップフォームパターン
複数ステップに分割されたフォームの構造を解析する:
- **ステップ数**: 全体のステップ数と各ステップのフィールド数
- **進捗表示**: ステップインジケーター（数字 / プログレスバー / パンくず形式）
- **ステップ間ナビゲーション**: 「次へ」「戻る」ボタンの配置、キーボードショートカット
- **バリデーションタイミング**: ステップ遷移時 / フィールド離脱時 / リアルタイム
- **データ保持**: ブラウザバック時のデータ保持、セッション間の一時保存

### インラインバリデーションタイミング
フォームバリデーションの発火タイミングを分析し、UX パターンを記録:
| タイミング | 発火条件 | 適切な用途 |
|-----------|---------|-----------|
| `onChange` | 入力値が変わるたび | パスワード強度メーター |
| `onBlur` | フィールドからフォーカスが外れた時 | メールアドレス、電話番号等の形式チェック |
| `onSubmit` | 送信ボタン押下時 | 全フィールドの最終検証 |
| `debounced` | 入力停止後300-500ms | ユーザー名の重複チェック等の非同期バリデーション |

### エラーメッセージ配置
- **フィールド直下**: 各入力欄の直下に赤字で表示（最も一般的）
- **フィールド内**: 入力欄のボーダーカラー変更 + ツールチップ
- **サマリー**: フォーム上部にエラー一覧を表示
- **トースト**: 画面端にトースト通知として表示

### オートフィル最適化
ブラウザのオートフィルを最大限活用する設定:
- `autocomplete` 属性の適切な値（`name`, `email`, `tel`, `organization`, `street-address` 等）
- `name` 属性の標準的な命名（ブラウザの推測精度に影響）

### モバイルキーボード最適化（inputmode）
| inputmode | 表示されるキーボード | 用途 |
|-----------|------------------|------|
| `text` | 通常キーボード | テキスト入力 |
| `email` | @キー付きキーボード | メールアドレス |
| `tel` | テンキー | 電話番号 |
| `url` | .com キー付きキーボード | URL入力 |
| `numeric` | 数字キーパッド | 数量、郵便番号 |
| `decimal` | 数字 + 小数点キーパッド | 金額 |
| `search` | 検索キー付きキーボード | 検索フィールド |

## アクセシビリティインタラクション

### キーボードトラップ防止
モーダル・ドロワー等のオーバーレイ要素でのフォーカス管理:
- **フォーカストラップ**: モーダル表示中はモーダル内にフォーカスを閉じ込める
- **フォーカス復帰**: モーダルを閉じた後、トリガー要素にフォーカスを戻す
- **Escape キー**: 全てのオーバーレイ要素を Escape キーで閉じられること
- **Tab 順序**: モーダル内の Tab 順序が論理的であること

### フォーカス管理パターン
| シナリオ | フォーカス管理 |
|---------|-------------|
| モーダル表示 | モーダル内の最初のフォーカス可能要素にフォーカス移動 |
| モーダル閉じ | トリガーボタンにフォーカス復帰 |
| タブ切り替え | 選択されたタブパネルの最初のコンテンツにフォーカス移動 |
| アコーディオン展開 | 展開されたコンテンツは読み上げ可能だがフォーカスは移動しない |
| 無限スクロール | 新規読み込みコンテンツの最初の要素にフォーカス移動 |
| エラー表示 | 最初のエラーメッセージまたは該当フィールドにフォーカス移動 |

### ライブリージョンアナウンスメント
スクリーンリーダーへの動的コンテンツ変更通知:
- `aria-live="polite"`: 非緊急の更新（検索結果数、フィルタ結果等）
- `aria-live="assertive"`: 緊急の更新（エラーメッセージ、フォーム送信完了等）
- `role="status"`: 状態変更の通知（ローディング完了等）
- `role="alert"`: 重要なアラート（バリデーションエラー等）

### スキップナビゲーション実装
```html
<a href="#main-content" class="sr-only focus:not-sr-only">
  メインコンテンツにスキップ
</a>
```
- ページ最上部に配置し、Tab キーで最初にフォーカスされる
- フォーカス時のみ表示される視覚スタイル

## パフォーマンスインタラクション

### debounce / throttle パターン
リアルタイムインタラクションのパフォーマンス最適化:
| パターン | 適用場面 | 推奨間隔 |
|---------|---------|---------|
| **debounce** | 検索入力、リサイズ、フォームバリデーション | 300-500ms |
| **throttle** | スクロールイベント、マウスムーブ、ウィンドウリサイズ | 100-200ms |

### Intersection Observer による遅延インタラクション
画面外の重いインタラクション要素を遅延初期化する:
- **スライダー**: 画面内に入るまで Swiper の初期化を遅延
- **地図**: `IntersectionObserver` で画面内に入った時に Google Maps を読み込み
- **動画**: `loading="lazy"` + `IntersectionObserver` で自動再生開始
- **アニメーション**: 画面外のアニメーションを一時停止し、CPU 使用率を削減

### オプティミスティック UI パターン
サーバー応答を待たずに UI を即座に更新するパターン:
- **フォーム送信**: 送信ボタン押下直後に「送信完了」UIを表示し、バックグラウンドで実際の送信を実行
- **いいねボタン**: クリック直後にカウントを+1し、API失敗時にロールバック
- **コメント投稿**: 即座にコメント一覧に追加し、サーバー確認後に正式反映
- **実装パターン**: `useState` で楽観的状態を管理 + `try/catch` でエラー時のロールバック
