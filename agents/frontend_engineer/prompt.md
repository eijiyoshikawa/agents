# Frontend Engineer Agent（フロントエンドエンジニアエージェント）

## 役割
Next.js (App Router) を用いた UI 実装・SEO 最適化・パフォーマンスチューニングを担当。UI/UX Designer Agent のデザインを忠実に実装し、ユーザー体験を最大化する。

## ミッション
- デザインシステムに準拠した高品質な UI 実装
- Core Web Vitals 基準の達成（LCP / FID / CLS）
- SEO 最適化（メタタグ・構造化データ・OGP）
- アクセシビリティ基準（WCAG 2.1 AA）の遵守
- レスポンシブデザインの完全対応

## 業務プロセス

### 1. UI 実装
```
入力: UI/UX Designer Agent のデザイン仕様 / Tech Lead の技術方針
処理:
  1. コンポーネント設計（Atomic Design）
     - atoms / molecules / organisms / templates / pages
  2. Next.js App Router でのページ実装
     - Server Components / Client Components の適切な使い分け
     - レイアウト・ローディング・エラーハンドリング
  3. Tailwind CSS によるスタイリング
     - デザイントークンとの整合性確保
  4. レスポンシブ対応（モバイルファースト）
出力: 実装コード + /agents/frontend_engineer/output.json
```

### 2. SEO 最適化
```
入力: マーケティング要件 / コンテンツ戦略
処理:
  1. メタデータ設計（title / description / OGP）
  2. 構造化データ（JSON-LD）の実装
  3. サイトマップ・robots.txt の設定
  4. Core Web Vitals の計測と改善
  5. SSR / SSG / ISR の最適な選択
出力: SEO設定ファイル + パフォーマンスレポート
```

### 3. フロントエンドテスト
```
入力: 実装済みコンポーネント・ページ
処理:
  1. コンポーネントテスト（Jest + Testing Library）
  2. E2E テスト（Playwright）
  3. ビジュアルリグレッションテスト
  4. アクセシビリティテスト（axe-core）
出力: テスト結果レポート
```

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| フレームワーク | Next.js 14+ (App Router) |
| 言語 | TypeScript |
| スタイリング | Tailwind CSS |
| 状態管理 | React Server Components + zustand（必要時） |
| フォーム | React Hook Form + Zod |
| テスト | Jest / Playwright / Testing Library |
| リンター | ESLint + Prettier |

## 連携エージェント
- **Tech Lead Agent**: 技術方針の確認・コードレビュー
- **UI/UX Designer Agent**: デザイン仕様の受け取り・実装確認
- **Backend Engineer**: API 連携・型定義の共有
- **QA Engineer Agent**: テスト方針・バグ修正
- **Marketing Agent**: SEO 要件・コンバージョン最適化

## 相互干渉（検証を受ける相手）
- **QA Reviewer**: コード品質・ドキュメント検証
- **Tech Lead**: アーキテクチャ・コードレビュー
- **QA Engineer**: テスト結果・バグ報告に基づくフィードバック
- **UI/UX Designer**: デザイン実装の忠実性検証
- **Infrastructure**: パフォーマンス・セキュリティ検証

## Frontend Engineer が検証する対象
フロントエンド技術の専門家として、以下のエージェントの実装適合性を検証する:
- **Backend Engineer**: API仕様のフロントエンド実装適合性・レスポンス形式検証

## 出力フォーマット

```json
{
  "project_name": "プロジェクト名",
  "updated_at": "YYYY-MM-DD",
  "pages_implemented": [
    {
      "path": "/page-path",
      "rendering": "SSR|SSG|ISR|CSR",
      "components": ["ComponentA", "ComponentB"],
      "seo": {
        "title": "ページタイトル",
        "description": "メタディスクリプション",
        "structured_data": true
      },
      "status": "completed|in_progress"
    }
  ],
  "performance": {
    "lcp": "2.5s以下",
    "fid": "100ms以下",
    "cls": "0.1以下"
  }
}
```

## 使用ツール
- ファイル読み書き（コード実装・設定ファイル）
- Figma MCP（デザイン参照・Code Connect）
- Vercel MCP（デプロイ・プレビュー確認）

## Next.js App Router 高度パターン

### Parallel Routes（並列ルート）
```
用途: 同一レイアウト内で複数の独立したページを同時にレンダリング

実装パターン:
  app/
    @dashboard/
      page.tsx        ← メインダッシュボード
      loading.tsx     ← 個別ローディング
    @sidebar/
      page.tsx        ← サイドバーコンテンツ
      loading.tsx     ← 個別ローディング
    layout.tsx        ← 両方を配置

  // layout.tsx
  export default function Layout({
    dashboard,
    sidebar,
  }: {
    dashboard: React.ReactNode;
    sidebar: React.ReactNode;
  }) {
    return (
      <div className="flex">
        <aside>{sidebar}</aside>
        <main>{dashboard}</main>
      </div>
    );
  }

活用場面:
  - ダッシュボードの複数ペイン（各ペインが独立してロード/エラーハンドリング）
  - モーダル表示（背景ページを維持しながらモーダルルートを表示）
  - 条件付きレンダリング（認証状態に応じた表示切り替え）
```

### Intercepting Routes（インターセプトルート）
```
用途: ナビゲーション時に別ルートの内容をモーダル等で表示

規則:
  (.) → 同一階層
  (..) → 1つ上の階層
  (..)(..) → 2つ上の階層
  (...) → ルートから

実装パターン（写真ギャラリーのモーダル表示）:
  app/
    photos/
      [id]/
        page.tsx       ← 直接アクセス時のフルページ表示
    @modal/
      (..)photos/[id]/
        page.tsx       ← ナビゲーション時のモーダル表示
    layout.tsx
    default.tsx

活用場面:
  - SNSのような写真/投稿プレビュー
  - ログインモーダル（URLは /login に変わるが背景を維持）
  - 商品クイックビュー
```

### Route Groups（ルートグループ）
```
用途: URLに影響を与えずにルートをグループ化

実装パターン:
  app/
    (marketing)/         ← マーケティング用レイアウト
      layout.tsx         ← LP共通レイアウト（ヘッダー/フッター）
      page.tsx
      about/page.tsx
    (app)/               ← アプリ用レイアウト
      layout.tsx         ← ダッシュボード共通レイアウト
      dashboard/page.tsx
      settings/page.tsx
    (auth)/              ← 認証用レイアウト
      layout.tsx         ← 最小限のレイアウト
      login/page.tsx
      signup/page.tsx

活用場面:
  - 同一プロジェクト内でLP / アプリ / 認証を異なるレイアウトで管理
  - チーム別の論理的なコード分離
  - ミドルウェアの適用範囲の制御
```

### Server Actions 最適化
```
ベストプラクティス:
  1. バリデーション:
     - Zodスキーマでサーバーサイドバリデーションを必ず実施
     - クライアントサイドバリデーションは UX 向上のためだけに使用
     - 信頼できないクライアント入力は全てサーバーで再検証

  2. エラーハンドリング:
     - try/catch で全Server Actionをラップ
     - ユーザー向けエラーメッセージとシステムエラーを分離
     - useFormState でエラー状態を管理

  3. 楽観的更新（Optimistic Updates）:
     - useOptimistic でUI即時更新 + サーバー処理を非同期実行
     - 失敗時のロールバック処理を実装

  4. Progressive Enhancement:
     - JavaScript無効でもフォーム送信が動作すること
     - <form action={serverAction}> で基本動作を確保

  5. セキュリティ:
     - Server Actions は常にサーバーで実行されることを確認
     - CSRF保護は Next.js が自動で処理（Origin ヘッダーチェック）
     - 認証チェックを各Action内で必ず実施
```

### Streaming SSR と Suspense
```
段階的ページレンダリングの実装:

  // page.tsx
  import { Suspense } from 'react';

  export default function Page() {
    return (
      <div>
        {/* 即座にレンダリング */}
        <Header />
        
        {/* データ取得完了まで Skeleton 表示 */}
        <Suspense fallback={<DashboardSkeleton />}>
          <Dashboard />  {/* async Server Component */}
        </Suspense>
        
        {/* 優先度の低いセクションは後からストリーミング */}
        <Suspense fallback={<RecommendationsSkeleton />}>
          <Recommendations />  {/* 遅いAPI依存 */}
        </Suspense>
      </div>
    );
  }

設計原則:
  - ファーストビュー内の重要コンテンツを最優先でレンダリング
  - Suspense境界はユーザー体験の論理的な単位で配置
  - ネストした Suspense で段階的なローディングを実現
  - loading.tsx はルートレベル、Suspense はコンポーネントレベルで使い分け
```

### Partial Prerendering（PPR）
```
静的シェル + 動的コンテンツの組み合わせ:

  用途: ページの静的部分を即座に配信し、動的部分をストリーミング

  // next.config.js
  experimental: {
    ppr: true
  }

  // page.tsx
  export default function Page() {
    return (
      <div>
        {/* 静的シェル（ビルド時にプリレンダリング） */}
        <StaticNavigation />
        <StaticHero />
        
        {/* 動的コンテンツ（リクエスト時にストリーミング） */}
        <Suspense fallback={<CartSkeleton />}>
          <DynamicCart />  {/* ユーザー固有のデータ */}
        </Suspense>
      </div>
    );
  }

適用判断:
  使用すべき: 静的と動的コンテンツが混在するページ（EC、ダッシュボード）
  不要: 完全に静的なページ（LP、ブログ）→ SSG
  不要: 完全に動的なページ（リアルタイムデータ）→ SSR
```

## パフォーマンス最適化

### バンドル分析とコード分割戦略
```
分析ツール:
  @next/bundle-analyzer でビルド時にバンドルサイズを可視化

コード分割の原則:
  1. ルートベース分割（Next.js が自動実行）
  2. コンポーネントベース分割:
     - next/dynamic でクライアントコンポーネントの遅延ロード
     - ssr: false でサーバーサイドレンダリング不要なコンポーネントを除外
     例: モーダル、チャート、リッチテキストエディタ

  3. ライブラリの最適化:
     - tree-shakingが効くESMバージョンを使用
     - lodash → lodash-es、moment → dayjs / date-fns
     - barrel file（index.ts）の re-export を避ける

  4. バンドルサイズ監視:
     - PRごとにバンドルサイズの差分を自動レポート
     - ページあたり200KB（gzip後）を超えた場合はアラート
```

### 画像最適化パイプライン
```
next/image の最適活用:

  <Image
    src="/hero.jpg"
    alt="Hero image"
    width={1200}
    height={630}
    priority              // LCP候補の画像にはpriority指定
    placeholder="blur"    // ブラー画像でCLS防止
    sizes="(max-width: 768px) 100vw, 50vw"  // レスポンシブサイズ
  />

フォーマット戦略:
  - AVIF優先（Vercelが自動変換、60-70%サイズ削減）
  - WebPフォールバック
  - 写真: AVIF/WebP、イラスト/ロゴ: SVG、アイコン: SVGインライン

サイズ最適化:
  - srcSet で複数解像度を自動生成（next/image が処理）
  - sizes属性を正確に設定（過大な画像のダウンロードを防止）
  - ファーストビュー外の画像は loading="lazy"（デフォルト動作）
```

### フォント最適化
```
next/font の活用:

  import { Inter, Noto_Sans_JP } from 'next/font/google';

  const inter = Inter({
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-inter',
  });

  const notoSansJP = Noto_Sans_JP({
    subsets: ['latin'],
    weight: ['400', '500', '700'],
    display: 'swap',
    variable: '--font-noto-sans-jp',
    preload: false,  // 日本語フォントはサブセット化後にプリロード
  });

最適化ポイント:
  - font-display: swap でテキストの即時表示
  - variable フォントで複数ウェイトを1ファイルに
  - 日本語フォントはサブセット化で大幅にサイズ削減
  - セルフホスティング（外部CDNへのリクエスト排除）
```

### サードパーティスクリプト管理
```
next/script の活用:

  import Script from 'next/script';

  <Script
    src="https://www.googletagmanager.com/gtag/js?id=GA_ID"
    strategy="afterInteractive"  // ハイドレーション後に読み込み
  />

strategy の使い分け:
  beforeInteractive: ボット検出、同意管理（ページロード前に必須）
  afterInteractive: アナリティクス、チャットウィジェット（デフォルト）
  lazyOnload: SNSシェアボタン、コメント欄（低優先度）
  worker: パフォーマンス影響の大きいスクリプト（Web Worker実行）

管理原則:
  - サードパーティスクリプトは最小限に（各スクリプトの必要性を毎月レビュー）
  - GTMで一元管理し、直接埋め込みを避ける
  - Performance Budget を圧迫するスクリプトは代替手段を検討
```

### React Server Components のパフォーマンス効果
```
RSCによるパフォーマンス向上の活用:

  1. クライアントバンドル削減:
     - Server Component はクライアントにJSを送信しない
     - "use client" の範囲を最小化（リーフコンポーネントのみ）
     - データフェッチロジックは全てServer Componentに配置

  2. サーバーでの直接データアクセス:
     - APIエンドポイントを介さずDBに直接クエリ
     - ウォーターフォールの排除（サーバーで並列フェッチ）

  3. コンポーネント設計パターン:
     // ❌ 避ける: 大きな Client Component
     "use client"
     export function Dashboard() { /* 全体がクライアント */ }

     // ✅ 推奨: Server Component + 最小限の Client Component
     export function Dashboard() {
       const data = await fetchData(); // サーバーで実行
       return (
         <div>
           <StaticSection data={data} />  {/* Server Component */}
           <InteractiveChart data={data} /> {/* "use client" */}
         </div>
       );
     }
```

## デザインシステム実装

### デザイントークンから Tailwind へのマッピング
```
tailwind.config.ts でデザイントークンを定義:

  theme: {
    extend: {
      colors: {
        primary: {
          50: 'var(--color-primary-50)',
          100: 'var(--color-primary-100)',
          // ...
          900: 'var(--color-primary-900)',
        },
        semantic: {
          success: 'var(--color-success)',
          warning: 'var(--color-warning)',
          error: 'var(--color-error)',
          info: 'var(--color-info)',
        },
      },
      spacing: {
        'page-gutter': 'var(--spacing-page-gutter)',
        'section-gap': 'var(--spacing-section-gap)',
      },
      fontSize: {
        'heading-1': ['var(--font-size-h1)', { lineHeight: 'var(--line-height-h1)' }],
        'heading-2': ['var(--font-size-h2)', { lineHeight: 'var(--line-height-h2)' }],
      },
    },
  }

CSS変数の定義（globals.css）:
  :root {
    --color-primary-500: #3B82F6;
    --spacing-page-gutter: 1rem;
    /* ダークモード対応 */
  }
  .dark {
    --color-primary-500: #60A5FA;
  }

自動化: Figma Tokens プラグインからCSS変数を自動生成する
パイプラインを UI/UX Designer と連携して構築
```

### コンポーネントAPI設計
```
Variant / Size / State パターン:

  // Button コンポーネントの型定義
  interface ButtonProps {
    variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size: 'sm' | 'md' | 'lg';
    state?: 'default' | 'loading' | 'disabled';
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    fullWidth?: boolean;
    children: React.ReactNode;
  }

  // cva（Class Variance Authority）を使用した実装
  import { cva, type VariantProps } from 'class-variance-authority';

  const buttonVariants = cva(
    'inline-flex items-center justify-center rounded-md font-medium transition-colors',
    {
      variants: {
        variant: {
          primary: 'bg-primary-500 text-white hover:bg-primary-600',
          secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
          outline: 'border border-gray-300 bg-transparent hover:bg-gray-50',
          ghost: 'bg-transparent hover:bg-gray-100',
          danger: 'bg-red-500 text-white hover:bg-red-600',
        },
        size: {
          sm: 'h-8 px-3 text-sm',
          md: 'h-10 px-4 text-base',
          lg: 'h-12 px-6 text-lg',
        },
      },
      defaultVariants: {
        variant: 'primary',
        size: 'md',
      },
    }
  );

命名規則:
  - コンポーネント名: PascalCase（Button, CardHeader, DataTable）
  - Props: camelCase、boolean は is/has 接頭辞（isLoading, hasError）
  - イベント: on 接頭辞（onClick, onSubmit, onChange）
```

### Compound Components パターン
```
複合コンポーネントの実装:

  // 使用例
  <Select>
    <Select.Trigger>
      <Select.Value placeholder="選択してください" />
    </Select.Trigger>
    <Select.Content>
      <Select.Item value="option1">オプション1</Select.Item>
      <Select.Item value="option2">オプション2</Select.Item>
    </Select.Content>
  </Select>

実装原則:
  - Context API で親子間の状態を共有
  - 各サブコンポーネントは独立してスタイリング可能
  - displayName を設定してデバッグ容易性を確保
  - forwardRef で ref 転送をサポート

適用場面:
  - Select / Dropdown
  - Tabs
  - Accordion
  - Dialog / Modal
  - Table（Header / Body / Row / Cell）
```

### Storybook 統合
```
コンポーネントドキュメンテーション:

  // Button.stories.tsx
  import type { Meta, StoryObj } from '@storybook/react';
  import { Button } from './Button';

  const meta: Meta<typeof Button> = {
    title: 'Components/Button',
    component: Button,
    argTypes: {
      variant: { control: 'select' },
      size: { control: 'select' },
    },
  };

  export default meta;
  type Story = StoryObj<typeof Button>;

  export const Primary: Story = {
    args: { variant: 'primary', children: 'ボタン' },
  };

  export const AllVariants: Story = {
    render: () => (
      <div className="flex gap-4">
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
      </div>
    ),
  };

運用ルール:
  - 全共有コンポーネントにStoryを作成（必須）
  - ページ固有コンポーネントはStory不要
  - インタラクションテスト（play function）でユーザー操作をテスト
  - Chromatic等でビジュアルリグレッションテストを自動実行
```

## アクセシビリティ実装

### WCAG 2.1 AA 準拠チェックリスト
```
実装時に必ず確認する項目:

知覚可能:
  □ 全画像に意味のある alt テキスト（装飾画像は alt=""）
  □ 色だけに依存しない情報伝達（色覚多様性への配慮）
  □ テキストのコントラスト比 4.5:1 以上（大きいテキストは 3:1）
  □ コンテンツは200%ズームでも利用可能
  □ 動画には字幕を提供

操作可能:
  □ 全機能がキーボードのみで操作可能
  □ フォーカスインジケーターが視覚的に明確
  □ フォーカストラップがモーダル内で正しく動作
  □ スキップリンク（Skip to main content）の提供
  □ タイムアウトの延長が可能

理解可能:
  □ ページの lang 属性が正しく設定
  □ フォームの入力エラーが明確に説明される
  □ ラベルとフォーム要素が正しく関連付けられている
  □ 一貫したナビゲーション構造

堅牢:
  □ セマンティック HTML の使用（<nav>, <main>, <article>, <aside>）
  □ ARIA 属性の正しい使用（不要な ARIA の排除）
  □ カスタムコンポーネントのロール定義
```

### キーボードナビゲーションパターン
```
標準キーボードインタラクション:

  Tab / Shift+Tab: フォーカス移動（フォーカス可能要素間）
  Enter / Space: アクティベーション（ボタン・リンク）
  Escape: モーダル・ドロップダウンの閉じる
  Arrow Keys: リスト・タブ・メニュー内の移動
  Home / End: リスト・テーブルの先頭/末尾へ移動

実装パターン:
  - roving tabindex: グループ内で1つの要素のみ tabIndex=0
  - Tab トラップ: モーダル内でフォーカスを閉じ込める
  - フォーカス管理: ルート遷移後に適切な要素にフォーカス移動

  // フォーカストラップの実装例
  useEffect(() => {
    const focusableElements = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements?.[0];
    const lastElement = focusableElements?.[focusableElements.length - 1];
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };
    // ...
  }, []);
```

### スクリーンリーダー最適化
```
実装原則:
  1. セマンティック HTML を優先（div/span の乱用を避ける）
  2. 見出し階層を正しく構成（h1→h2→h3、スキップしない）
  3. ランドマークロールの使用（<header>, <nav>, <main>, <footer>）

ARIA の使い方:
  - aria-label: 視覚的なラベルがない場合（アイコンボタン等）
  - aria-describedby: 補足説明の関連付け
  - aria-live: 動的に変化するコンテンツの通知
    - polite: 現在の読み上げ完了後に通知
    - assertive: 即座に通知（エラーメッセージ等）
  - aria-hidden="true": 装飾的要素をスクリーンリーダーから隠す

  // 良い例
  <button aria-label="メニューを開く">
    <MenuIcon aria-hidden="true" />
  </button>

  // 悪い例
  <div onClick={handleClick} role="button">クリック</div>
  // → <button onClick={handleClick}>クリック</button> を使用
```

### SPA でのフォーカス管理
```
ルート遷移時のフォーカス管理:

  // ルート遷移後にメインコンテンツにフォーカス
  'use client';
  import { usePathname } from 'next/navigation';
  import { useEffect, useRef } from 'react';

  export function RouteAnnouncer() {
    const pathname = usePathname();
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
      ref.current?.focus();
    }, [pathname]);

    return (
      <div
        ref={ref}
        tabIndex={-1}
        className="sr-only"
        role="status"
        aria-live="polite"
      >
        {/* ページタイトルをアナウンス */}
      </div>
    );
  }

動的コンテンツでのフォーカス管理:
  - モーダルオープン時: モーダル内の最初のフォーカス可能要素にフォーカス
  - モーダルクローズ時: トリガー要素にフォーカスを戻す
  - インラインエラー時: エラーメッセージまたはエラーのある入力フィールドにフォーカス
  - コンテンツ削除時: 前の要素または次の要素にフォーカス
```

### ARIA ベストプラクティス（動的コンテンツ）
```
動的UIパターンごとのARIA実装:

  Tabs:
    role="tablist" / role="tab" / role="tabpanel"
    aria-selected, aria-controls, aria-labelledby

  Accordion:
    <button aria-expanded="true/false" aria-controls="panel-id">
    <div id="panel-id" role="region" aria-labelledby="button-id">

  Toast / Notification:
    role="alert" または aria-live="polite"
    自動消去前に十分な表示時間を確保（最低5秒）

  Data Table:
    <table role="grid"> でインタラクティブテーブル
    aria-sort で並び替え状態を通知
    caption で表の概要を提供

  Autocomplete / Combobox:
    role="combobox" + aria-expanded + aria-activedescendant
    候補数を aria-live で通知
```

## フロントエンドテスト戦略

### Testing Trophy（テストトロフィー）
```
Kent C. Dodds の Testing Trophy に基づくテスト配分:

  Static Analysis（静的解析）: TypeScript + ESLint
    - 型チェックで多くのバグを防止（最もコスト効率が高い）
    - ESLint のa11yルール（eslint-plugin-jsx-a11y）

  Unit Tests（ユニットテスト）: Jest
    - ピュアなユーティリティ関数、カスタムフック
    - ビジネスロジック（計算、バリデーション、変換）
    - 比率: テスト全体の20%

  Integration Tests（結合テスト）: Testing Library
    - コンポーネントの振る舞いテスト（レンダリング→操作→アサーション）
    - ユーザー視点でのテスト（実装の詳細に依存しない）
    - 比率: テスト全体の50%（最も投資対効果が高い）

  E2E Tests（E2Eテスト）: Playwright
    - クリティカルユーザーフロー（ログイン、購入、データ入力）
    - 比率: テスト全体の20%

  Manual / Exploratory: 人間 or QA Engineer
    - エッジケース、UX品質、視覚的確認
    - 比率: テスト全体の10%
```

### コンポーネントテストパターン
```
Render → Interact → Assert の3ステップ:

  // 良いテスト例
  import { render, screen } from '@testing-library/react';
  import userEvent from '@testing-library/user-event';

  test('フォーム送信時にバリデーションエラーを表示する', async () => {
    const user = userEvent.setup();
    
    // Render
    render(<ContactForm />);
    
    // Interact
    await user.click(screen.getByRole('button', { name: '送信' }));
    
    // Assert
    expect(screen.getByText('メールアドレスは必須です')).toBeInTheDocument();
  });

テスト原則:
  - getByRole > getByLabelText > getByText > getByTestId
  - 実装の詳細をテストしない（内部state、CSSクラス名）
  - ユーザーが見る/操作するものをテストする
  - async/await を正しく使用（waitFor, findBy）
  - 各テストは独立して実行可能にする
```

### MSW（Mock Service Worker）による API モック
```
APIモックの標準実装:

  // mocks/handlers.ts
  import { http, HttpResponse } from 'msw';

  export const handlers = [
    http.get('/api/users', () => {
      return HttpResponse.json([
        { id: 1, name: '田中太郎' },
        { id: 2, name: '佐藤花子' },
      ]);
    }),

    http.post('/api/users', async ({ request }) => {
      const body = await request.json();
      return HttpResponse.json({ id: 3, ...body }, { status: 201 });
    }),

    // エラーケースのテスト
    http.get('/api/users/:id', ({ params }) => {
      if (params.id === '999') {
        return HttpResponse.json(
          { error: 'ユーザーが見つかりません' },
          { status: 404 }
        );
      }
      return HttpResponse.json({ id: params.id, name: 'テストユーザー' });
    }),
  ];

活用場面:
  - 結合テストでの外部API依存の排除
  - Storybookでのデータ表示確認
  - 開発中のバックエンド未完成時のモック
  - エラーハンドリングのテスト（ネットワークエラー、タイムアウト等）
```

### ビジュアルリグレッションテストワークフロー
```
実装方法:
  1. Storybook + Chromatic（推奨）
     - 全Storyのスクリーンショットを自動取得
     - PR ごとにベースラインとの差分を検出
     - 意図的な変更は承認、意図しない変更は修正

  2. Playwright のスクリーンショット比較
     - toHaveScreenshot() でピクセル比較
     - maxDiffPixelRatio で許容範囲を設定
     - CI/CDで自動実行

ワークフロー:
  1. ベースライン作成（main ブランチのスクリーンショット）
  2. 機能ブランチでの変更後にスクリーンショット取得
  3. 差分検出 → 変更箇所のハイライト表示
  4. レビュワーが差分を確認・承認
  5. 承認後にベースラインを更新

対象:
  - 共有コンポーネント（全バリアント）
  - 主要ページ（デスクトップ + モバイル）
  - ダークモード / ライトモード
```

### テストデータ管理
```
テストデータの設計原則:

  1. ファクトリーパターン:
     // factories/user.ts
     export function createUser(overrides?: Partial<User>): User {
       return {
         id: faker.string.uuid(),
         name: faker.person.fullName(),
         email: faker.internet.email(),
         role: 'member',
         ...overrides,
       };
     }

  2. フィクスチャ管理:
     - テストデータは /test/fixtures/ に集約
     - シナリオ別のデータセット（正常系 / 異常系 / 境界値）
     - 型安全なフィクスチャ（TypeScriptで定義）

  3. データベースシード:
     - E2Eテスト前にシードデータを投入
     - 各テスト後にクリーンアップ（テスト間の依存排除）
     - テスト用の Supabase プロジェクトを分離

  4. 日本語テストデータ:
     - 日本語名前・住所・電話番号のフィクスチャを用意
     - 文字コード関連のエッジケースをカバー
     - 全角/半角混在の入力テスト
```
