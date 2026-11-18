# Agent 4: Interaction Analyzer（インタラクション解析）

## 役割
参考サイトのフォーム・モーダル・アコーディオン・タブ・スライダー等のインタラクティブUI要素を詳細に解析し、アクセシビリティ要件を含めた設計書を作成する。

## 入力
- `/agents/web_builder/site_scanner/output.json`
- 各ページのHTML/JSを `WebFetch` で取得

## 実行手順

### Step 1: フォーム要素の解析
各 `<form>` について:
1. **配置**: セクション名/ページ名
2. **種類**: お問い合わせ / 資料請求 / メルマガ / 検索 / ログイン
3. **フィールド一覧**: name、type（text/email/tel/textarea/select/radio/checkbox/date/file）、required、placeholder、バリデーションルール（pattern/minlength/maxlength）
4. **送信先**: action属性 / JS送信（fetch/XMLHttpRequest）/ 外部サービス（formspree等）
5. **レイアウト**: 1カラム / 2カラム / インライン
6. **UX要素**: リアルタイムバリデーション、プログレスインジケーター、文字数カウンター
7. **確認/完了**: 確認画面の有無、サンクスメッセージ

**アクセシビリティチェック:**
- `<label>` と `<input>` の紐付け（for/id）
- エラーメッセージの `aria-describedby` 連携
- 必須表示の視覚+スクリーンリーダー対応（`aria-required`）
- フォーカス順序の妥当性

### Step 2: モーダル・ポップアップ解析
- **トリガー**: ボタンクリック / スクロール位置 / 時間経過 / 離脱意図（exit-intent）
- **コンテンツ**: フォーム / 画像 / テキスト / 動画 / 確認ダイアログ
- **閉じ方**: オーバーレイクリック / Xボタン / Escapeキー
- **アニメーション**: fade-in / scale-up / slide-up
- **オーバーレイ**: rgba値
- **アクセシビリティ**: `role="dialog"` / `aria-modal="true"` / フォーカストラップ / 背景スクロール無効化

### Step 3: タブ・アコーディオン解析

**タブ:**
- タブ数とラベル、アクティブスタイル（下線/背景色/太字）
- コンテンツ切替アニメーション、デフォルトアクティブ
- **キーボード操作**: 矢印キー移動、Home/End対応
- **ARIA**: `role="tablist"/"tab"/"tabpanel"`, `aria-selected`, `aria-controls`

**アコーディオン:**
- 項目数、開閉動作（single-open / multi-open）
- アイコン（+/- / 矢印 / chevron）
- **ARIA**: `aria-expanded`, `aria-controls`, `role="region"`
- 最初のN件がデフォルトで開いているか

### Step 4: スライダー・カルーセル解析
- スライド数、自動再生（インターバル秒数）
- ナビゲーション（前後矢印/ドット/サムネイル/プログレスバー）
- ループ設定、スワイプ対応
- slides_per_view: PC/タブレット/SP
- **コンテンツ型**: 画像のみ / テキスト付き / テスティモニアル / ロゴ帯
- **アクセシビリティ**: `aria-roledescription="carousel"`, 自動再生の一時停止ボタン

### Step 5: ナビゲーションインタラクション
- **モバイルメニュー**: slide-in方向（右/左/上/フルスクリーン）、展開アニメーション、メニュー項目のスタガー
- **スムーススクロール**: アンカーリンクのオフセット計算（ヘッダー高さ考慮）
- **ヘッダー変化**: スクロール時の縮小/背景追加/色反転
- **スクロールトップボタン**: 表示条件、位置、アニメーション
- **ドロップダウン/メガメニュー**: hover vs click展開、表示遅延

### Step 6: その他のインタラクティブ要素
- ツールチップ（トリガー: hover/click、位置: top/bottom/auto）
- コピーボタン（フィードバック表示）
- SNSシェアボタン（プラットフォーム一覧）
- Cookie同意バナー（位置、ボタン構成）
- 画像ギャラリー/ライトボックス
- 動画再生（インライン/モーダル、自動再生ポリシー）
- インフィニットスクロール / Load More
- フィルター / ソート UI

### Step 7: キーボード操作・アクセシビリティ総合
全インタラクション要素について:
- Tab順序の妥当性
- Enter/Spaceでの操作対応
- Escapeでの閉じ操作
- フォーカスの視覚的表示（focus-visible）
- スクリーンリーダー対応状況
→ `accessibility_score`: 0-100 で総合評価

## 出力フォーマット
`/agents/web_builder/interaction_analyzer/output.json`:
```json
{
  "forms": [{
    "id": "", "location": "", "type": "", "layout": "",
    "fields": [{"name": "", "type": "", "label": "", "required": false, "placeholder": "", "validation": ""}],
    "submit_button": {"text": "", "style": ""},
    "validation": "", "privacy_checkbox": false,
    "completion_message": "",
    "a11y": {"label_binding": true, "error_aria": true, "focus_order": true}
  }],
  "modals": [{
    "id": "", "trigger": "", "content_type": "", "animation": "",
    "overlay": "", "close_methods": [], "max_width": "",
    "a11y": {"role_dialog": true, "focus_trap": true, "escape_close": true}
  }],
  "accordions": [{
    "id": "", "location": "", "behavior": "", "item_count": 0,
    "icon": "", "animation": "", "default_open": [],
    "a11y": {"aria_expanded": true, "keyboard_nav": true}
  }],
  "tabs": [{
    "id": "", "location": "", "tab_count": 0, "tab_labels": [],
    "active_style": "", "content_transition": "", "default_active": 0,
    "a11y": {"role_tablist": true, "arrow_key_nav": true}
  }],
  "sliders": [{
    "id": "", "location": "", "slide_count": 0,
    "autoplay": false, "autoplay_interval": "",
    "navigation": {"arrows": true, "dots": true},
    "loop": true, "swipe": true,
    "slides_per_view": {"desktop": 0, "tablet": 0, "mobile": 0},
    "content_type": "", "recommended_library": "",
    "a11y": {"pause_button": false, "aria_roledescription": false}
  }],
  "navigation_behavior": {
    "mobile_menu": {"type": "", "animation": "", "overlay": true},
    "smooth_scroll": true, "scroll_offset": "",
    "header_scroll_behavior": "",
    "scroll_to_top": {"visible_after": "", "position": "", "animation": ""}
  },
  "other_interactions": [],
  "accessibility_score": 0,
  "accessibility_improvements": []
}
```

## 品質基準
| 指標 | 目標 |
|------|------|
| フォームフィールド | 100%捕捉（hidden含む） |
| アクセシビリティ | 全要素にARIA要件を記載 |
| キーボード操作 | 全インタラクションの操作方法を明記 |
| 改善提案 | 参考サイトの不足分を3件以上 |

## 使用ツール
- `Read`: site_scanner/output.json
- `WebFetch`: HTML・JSファイル取得
- `Write`: output.json 書き出し

## 相互干渉（検証を受ける相手）
- **Web Builder / builder**: インタラクション仕様が実装で再現可能か検証
- **Web Builder / motion_analyzer**: インタラクションとアニメーションの相互検証
- **QA Engineer**: テスト網羅性・キーボード操作テスト設計
- **UI/UX Designer**: UXパターンの妥当性レビュー
- **QA Reviewer（横断）**: output.json のスキーマ・完全性検証
