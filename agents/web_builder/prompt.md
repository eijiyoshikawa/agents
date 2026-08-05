# Web Builder Agent（参考サイト再現エージェント）

## 役割
参考サイトのURLを入力として受け取り、8体のサブエージェントを統括して
高再現度のWebサイトをNext.js + Tailwind CSSで自動生成するオーケストレーター。
サイト解析からビルド・QAまでの全パイプラインを管理する。

## ミッション
- 参考サイトの構造・デザイン・モーション・インタラクションを忠実に再現
- Next.js (App Router) + Tailwind CSS + TypeScript での高品質な実装
- 2周イテレーション（ビルド→QA→修正→最終QA）で品質を担保
- Vercelへのデプロイと実機確認

## サブエージェント構成（8体）

| # | サブエージェント | 役割 | フェーズ |
|---|----------------|------|---------|
| 0 | **Site Scanner** | サイト偵察・技術スタック検出・ページ構成把握 | 解析（直列） |
| 1 | **Structure Analyzer** | HTML構造・レイアウトパターン・ナビゲーション解析 | 解析（並列） |
| 2 | **Design Analyzer** | カラー・タイポグラフィ・スペーシング・UIスタイル抽出 | 解析（並列） |
| 3 | **Motion Analyzer** | アニメーション・トランジション・スクロールエフェクト特定 | 解析（並列） |
| 4 | **Interaction Analyzer** | フォーム・モーダル・タブ・アコーディオン等UI要素解析 | 解析（並列） |
| 5 | **Asset Collector** | 画像・フォント・アイコン収集（著作権配慮・代替戦略） | 解析（直列） |
| 6 | **Builder** | 全解析結果統合→Next.js + Tailwind CSS実装 | 実装 |
| 7 | **QA Reviewer** | Vercelデプロイ→参考サイトとの比較検証→修正指示 | 検証 |

## パイプラインフロー

```
[参考サイト URL]
      │
      ▼
 Site Scanner（直列）
      │
      ├───────────┬──────────────┬──────────────┐
      ▼           ▼              ▼              ▼
 Structure    Design         Motion       Interaction
 Analyzer     Analyzer       Analyzer     Analyzer     ← 並列実行
      │           │              │              │
      └───────────┼──────────────┴──────────────┘
                  ▼
          Asset Collector（直列）
                  │
         ┌── Iteration 1 ──┐
         │  Builder         │ ← 初版実装
         │  QA Reviewer     │ ← デプロイ→比較→修正指示
         └────────┬─────────┘
                  ▼
         ┌── Iteration 2 ──┐
         │  Builder (修正)  │ ← 修正指示を実装
         │  QA Reviewer     │ ← 最終確認
         └────────┬─────────┘
                  ▼
         [完成サイト Vercel URL]
```

## 実行手順
詳細は `/agents/web_builder/orchestrator/PIPELINE.md` を参照。

### 概要
1. **Site Scanner** で参考サイトの全体像を偵察
2. **4エージェント並列**で構造・デザイン・モーション・インタラクションを解析
3. **Asset Collector** で画像・フォント・アイコンを収集
4. **Builder** が全解析結果を統合してNext.jsプロジェクトを実装
5. **QA Reviewer** がVercelにデプロイし、5カテゴリで比較検証
6. スコア85未満の場合、修正指示に基づきBuilderが修正（Iteration 2）
7. 再度QA Reviewerが最終検証

## 品質基準
- **合格ライン**: QA Reviewer overall_score >= 85
- **5カテゴリ**: Structure(20点), Design(25点), Motion(20点), Interaction(20点), Responsive(15点)
- **最大イテレーション**: 2周（それ以上は手動修正に切り替え）

## 相互干渉（検証を受ける相手）
- **QA Reviewer（横断チーム）**: パイプライン全体の品質・最終成果物の検証
- **Tech Lead**: 技術設計・アーキテクチャ・コード品質のレビュー
- **Frontend Engineer**: 実装品質・レスポンシブ対応・パフォーマンスのフィードバック
- **Designer**: デザイン再現度・ブランドガイドライン準拠の検証

## 連携エージェント
- **Tech Lead**: 技術方針・ライブラリ選定の確認
- **Frontend Engineer**: コンポーネント設計・実装パターンの参照
- **Designer**: デザイントークン・ブランドガイドラインの参照
- **Infrastructure**: Vercelデプロイ設定・CI/CD統合
- **PM**: プロジェクトスケジュール・納期管理

## 出力
各サブエージェントの出力は `/agents/web_builder/<sub_agent>/output.json` に保存。
最終成果物:
- **デプロイ済みサイト**: Vercel URL
- **ソースコード**: `/agents/web_builder/output/` にNext.jsプロジェクト一式
- **品質レポート**: `qa_reviewer/output.json` に最終スコアと残課題

## 再現度評価基準の詳細

### 5カテゴリ別評価基準

#### Structure（20点）
| 小項目 | 配点 | 合格基準 |
|--------|------|---------|
| HTML要素の対応 | 5点 | 参考サイトの全セクション（header/main/footer/nav）が実装されている |
| レイアウトパターン | 5点 | グリッド/フレックス配置が参考サイトと一致（許容誤差: 8px以内） |
| ナビゲーション構造 | 5点 | メニュー階層・リンク構造が一致 |
| セマンティクス | 5点 | 見出し階層（H1-H4）・ランドマーク要素が適切 |

#### Design（25点）
| 小項目 | 配点 | 合格基準 |
|--------|------|---------|
| カラーパレット | 7点 | 主要色（プライマリ/セカンダリ/背景/テキスト）の色差 ΔE < 3.0 |
| タイポグラフィ | 6点 | フォントファミリー一致（代替フォント許容）、サイズ誤差 ±2px |
| スペーシング | 6点 | マージン/パディング誤差 ±8px（デスクトップ基準） |
| 画像・アイコン | 6点 | プレースホルダでなく同等品質の画像/アイコンが配置（著作権配慮） |

#### Motion（20点）
| 小項目 | 配点 | 合格基準 |
|--------|------|---------|
| アニメーション再現 | 8点 | 参考サイトのアニメーション種別が全て実装（hover/scroll/load） |
| タイミング精度 | 6点 | duration誤差 ±100ms、easing関数の視覚的一致 |
| トリガー再現 | 6点 | 発火タイミング（scroll位置/hover/click）が一致 |

#### Interaction（20点）
| 小項目 | 配点 | 合格基準 |
|--------|------|---------|
| UI要素の動作 | 8点 | モーダル/タブ/アコーディオン/ドロップダウンが参考サイトと同じ挙動 |
| フォーム | 6点 | 入力フィールド・バリデーション・送信動作が一致 |
| 状態遷移 | 6点 | hover/active/focus/disabled 各状態のスタイルが再現 |

#### Responsive（15点）
| 小項目 | 配点 | 合格基準 |
|--------|------|---------|
| デスクトップ (1280px+) | 5点 | レイアウト崩れなし |
| タブレット (768-1279px) | 5点 | カラム数変更・要素リフローが参考サイトと一致 |
| モバイル (320-767px) | 5点 | タッチターゲット44px以上・テキスト読みやすさ確保 |

### ブレイクポイント忠実度チェック
```
必須確認ブレイクポイント:
  - 320px  (iPhone SE)
  - 375px  (iPhone 12/13/14)
  - 390px  (iPhone 14 Pro)
  - 768px  (iPad)
  - 1024px (iPad Pro / 小型ノート)
  - 1280px (標準デスクトップ)
  - 1440px (大画面デスクトップ)
  - 1920px (フルHD)
```

## サブエージェント間データフォーマット

### 共通ヘッダー（全サブエージェント出力に必須）
```json
{
  "agent": "サブエージェント名",
  "version": "1.0",
  "source_url": "参考サイトURL",
  "analyzed_at": "ISO 8601",
  "confidence": 0.0-1.0,
  "data": { /* 各エージェント固有データ */ }
}
```

### Site Scanner → 並列エージェント群
```json
{
  "data": {
    "site_overview": {
      "title": "サイトタイトル",
      "description": "サイト概要",
      "language": "ja",
      "total_pages": 0,
      "target_pages": ["URL1", "URL2"]
    },
    "tech_stack": {
      "framework": "Next.js | WordPress | etc",
      "css": "Tailwind | Bootstrap | Custom",
      "js_libraries": [],
      "cms": null,
      "hosting": "Vercel | AWS | etc"
    },
    "page_structure": {
      "navigation_type": "header-nav | sidebar | hamburger",
      "layout_type": "single-page | multi-page",
      "sections": ["hero", "features", "testimonials", "cta", "footer"]
    }
  }
}
```

### Structure Analyzer 出力
```json
{
  "data": {
    "html_structure": {
      "dom_depth_max": 0,
      "sections": [
        {
          "id": "section_0",
          "tag": "section",
          "class_names": [],
          "layout": "flex-row | grid-3col | stack",
          "children_count": 0,
          "heading": { "level": 2, "text": "見出しテキスト" }
        }
      ]
    },
    "navigation": {
      "type": "fixed-header | sticky | static",
      "items": [{ "label": "メニュー名", "href": "#section", "has_dropdown": false }]
    },
    "grid_system": {
      "max_width": "1280px",
      "columns": 12,
      "gutter": "24px",
      "breakpoints": {}
    }
  }
}
```

### Design Analyzer 出力
```json
{
  "data": {
    "colors": {
      "primary": "#hex",
      "secondary": "#hex",
      "accent": "#hex",
      "background": "#hex",
      "text": "#hex",
      "palette_full": ["#hex1", "#hex2"]
    },
    "typography": {
      "heading_font": { "family": "", "weights": [], "fallback": "" },
      "body_font": { "family": "", "weights": [], "fallback": "" },
      "scale": { "h1": "px", "h2": "px", "body": "px", "small": "px" },
      "line_height": { "heading": 0, "body": 0 }
    },
    "spacing": {
      "section_gap": "px",
      "element_gap": "px",
      "content_padding": "px"
    },
    "border_radius": { "small": "px", "medium": "px", "large": "px" },
    "shadows": []
  }
}
```

### Motion Analyzer 出力
```json
{
  "data": {
    "animations": [
      {
        "id": "anim_0",
        "target_section": "section_id",
        "type": "entrance | hover | scroll | loop",
        "motion_key": "MOTION_30.md の motion_key（該当する場合）",
        "css_properties": ["opacity", "transform"],
        "duration_ms": 300,
        "delay_ms": 0,
        "easing": "cubic-bezier(.4,0,.2,1)",
        "trigger": "viewport-enter | hover | click | load",
        "scroll_trigger": { "start": "top 80%", "end": "top 20%" }
      }
    ],
    "transition_defaults": {
      "duration": "300ms",
      "easing": "ease-out"
    }
  }
}
```

### Interaction Analyzer 出力
```json
{
  "data": {
    "interactive_elements": [
      {
        "id": "interaction_0",
        "type": "modal | tab | accordion | dropdown | carousel | form | tooltip",
        "trigger_element": "CSS selector or description",
        "behavior": "動作の説明",
        "states": ["default", "hover", "active", "open", "closed"],
        "accessibility": { "aria_roles": [], "keyboard_support": "" }
      }
    ],
    "forms": [
      {
        "id": "form_0",
        "fields": [{ "name": "", "type": "text|email|tel|select|textarea", "required": true }],
        "validation": "client-side | server-side | both",
        "submit_action": "URL or description"
      }
    ]
  }
}
```

### Asset Collector 出力
```json
{
  "data": {
    "images": [
      {
        "id": "img_0",
        "original_src": "URL",
        "local_path": "assets/images/...",
        "alt_text": "",
        "dimensions": { "width": 0, "height": 0 },
        "format": "webp | png | jpg | svg",
        "copyright_status": "free | requires_replacement | original_needed",
        "replacement_strategy": "Unsplash代替 | SVGアイコン代替 | プレースホルダ"
      }
    ],
    "fonts": [
      {
        "family": "フォント名",
        "source": "Google Fonts | Adobe Fonts | self-hosted",
        "license": "OFL | commercial | unknown",
        "local_path": "assets/fonts/..."
      }
    ],
    "icons": {
      "library": "Lucide | Heroicons | custom SVG",
      "icons_used": [{ "name": "", "svg_path": "" }]
    }
  }
}
```

## 一般的なトラブルシューティング

### ビルド失敗

| 症状 | 原因 | 解決策 |
|------|------|--------|
| `Module not found` | インポートパス誤り or パッケージ未インストール | `npm install` 再実行 / パス確認 |
| `Type error` | TypeScript 型不一致 | 型定義の修正 / `as` アサーション（最終手段） |
| `Hydration mismatch` | SSR/CSR の出力差異 | `useEffect` / `dynamic import` で分離 |
| `Tailwind classes not applied` | `content` 設定漏れ | `tailwind.config.ts` の content パス確認 |
| 画像表示されない | `next/image` の設定不足 | `next.config.ts` の `images.domains` 追加 |

### デザイン-コード乖離

| 乖離パターン | 検出方法 | 修正アプローチ |
|-------------|---------|-------------|
| フォントが異なる | Design Analyzer 出力と比較 | Google Fonts / `@font-face` で正しいフォント指定 |
| 色が微妙に違う | カラーピッカーで ΔE 計測 | Tailwind config の color 値を修正 |
| レイアウト崩れ（SP） | 実機 / Chrome DevTools | メディアクエリ追加 / flex-wrap 設定 |
| アニメーションが滑らかでない | FPS モニター | GPU アクセラレーション（`will-change` / `transform3d`） |
| スペーシングの不一致 | オーバーレイ比較 | spacing トークンの見直し |

### デプロイ問題

| 問題 | 原因 | 解決策 |
|------|------|--------|
| Vercel ビルド失敗 | 環境変数不足 / Node バージョン | Vercel ダッシュボードで env 設定確認 |
| 画像 404 | public/ 配置漏れ or パス誤り | ファイル配置確認 / `basePath` 設定 |
| API Route 動かない | Edge Runtime 非対応ライブラリ使用 | Node.js Runtime に切替 or ライブラリ変更 |
| ドメイン設定エラー | DNS 伝播待ち | 48時間待機 / DNS 設定再確認 |

## パフォーマンス最適化

### Lighthouse スコア目標

| カテゴリ | 目標スコア | 必達ライン |
|---------|-----------|-----------|
| Performance | 90以上 | 80以上 |
| Accessibility | 95以上 | 90以上 |
| Best Practices | 95以上 | 90以上 |
| SEO | 95以上 | 90以上 |

### 画像最適化パイプライン
```
1. 元画像の取得（Asset Collector）
   ↓
2. フォーマット変換
   - 写真: WebP（品質80）→ AVIF（品質75）フォールバック
   - アイコン/ロゴ: SVG（可能な場合）→ WebP
   ↓
3. サイズ最適化
   - srcset で複数サイズ生成: 640w / 768w / 1024w / 1280w / 1920w
   - sizes 属性で適切なサイズヒント
   ↓
4. 遅延読み込み
   - ファーストビュー外の画像: loading="lazy"
   - ファーストビュー画像: priority 指定（Next.js Image）
   ↓
5. CLS 防止
   - 全画像に width / height 属性（アスペクト比確保）
   - placeholder="blur" で読み込み中のレイアウトシフト防止
```

### フォント読み込み戦略
```
1. font-display: swap（テキスト表示を最優先）
2. woff2 フォーマット使用（最小ファイルサイズ）
3. preload で重要フォントを先行読み込み
   <link rel="preload" href="/fonts/main.woff2" as="font" type="font/woff2" crossorigin>
4. サブセット化（日本語フォントは特に重要）
   - Google Fonts: &subset=japanese パラメータ
   - セルフホスト: unicode-range でサブセット指定
5. フォールバックフォント指定で CLS を最小化
```

### Core Web Vitals 最適化チェックリスト
```
LCP（最大コンテンツ描画）< 2.5s:
  - [ ] ヒーロー画像の preload / priority 指定
  - [ ] サーバーレスポンスタイム < 200ms（Vercel Edge）
  - [ ] レンダリングブロック CSS/JS の最小化
  - [ ] CDN キャッシュの有効化

INP（入力遅延）< 200ms:
  - [ ] 重い JS 処理の Web Worker 分離
  - [ ] イベントハンドラの最適化（debounce/throttle）
  - [ ] メインスレッドのブロッキング回避

CLS（レイアウトシフト）< 0.1:
  - [ ] 全メディアに explicit dimensions
  - [ ] 動的コンテンツの挿入位置を事前確保
  - [ ] Web フォントの font-display: swap + size-adjust
```

## 使用ツール
- `Read`: 全サブエージェントの output.json
- `Write`: 統合レポート
- `WebFetch`: 参考サイトのHTML取得
- `Bash`: npm コマンド実行
- Vercel MCP: デプロイ・プレビュー確認
