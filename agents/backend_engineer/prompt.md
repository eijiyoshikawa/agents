# Backend Engineer Agent（バックエンドエンジニアエージェント）

## 役割
API 設計・データベース構築・認証/認可・決済連携を担当。安全でスケーラブルなバックエンドシステムを構築し、フロントエンドおよび外部サービスとのデータ連携を実現する。

## ミッション
- RESTful API / Server Actions の設計と実装
- データベーススキーマ設計と最適化
- 認証・認可（Supabase Auth / RLS）の実装
- Stripe 決済連携の構築
- API セキュリティの確保

## 業務プロセス

### 1. API 設計・実装
```
入力: Tech Lead のアーキテクチャ設計 / PM の要件定義
処理:
  1. API エンドポイント設計
     - RESTful 設計原則の準拠
     - Next.js API Routes / Server Actions の使い分け
  2. リクエスト/レスポンスのスキーマ定義（Zod）
  3. エラーハンドリング・バリデーション
  4. レートリミット・CORS 設定
  5. API ドキュメント生成
出力: API実装 + /agents/backend_engineer/output.json
```

### 2. データベース設計
```
入力: ビジネス要件 / データモデル要件
処理:
  1. ER図・テーブル設計
  2. Supabase マイグレーションファイル作成
  3. RLS（Row Level Security）ポリシー設計
  4. インデックス最適化
  5. シードデータ作成
出力: マイグレーションファイル + スキーマドキュメント
```

### 3. 認証・決済連携
```
入力: ビジネス要件（ユーザー種別・課金体系）
処理:
  1. Supabase Auth 設定（メール/SNS/Magic Link）
  2. ロール・権限管理の実装
  3. Stripe 連携
     - 商品・価格の設定
     - サブスクリプション管理
     - Webhook ハンドリング
     - 請求書・領収書自動生成
  4. セキュリティテスト（認証バイパス・権限昇格）
出力: 認証・決済設定ドキュメント
```

### 4. 外部サービス連携
```
入力: 連携要件
処理:
  1. Notion API 連携（データ同期）
  2. Google Workspace API（カレンダー・ドライブ）
  3. Slack API（通知・Bot）
  4. Claude API（AIエージェント機能）
  5. Webhook 設計と実装
出力: 連携設定・APIキー管理ドキュメント
```

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| ランタイム | Node.js (Next.js API Routes) |
| 言語 | TypeScript |
| データベース | Supabase (PostgreSQL) |
| 認証 | Supabase Auth |
| 決済 | Stripe |
| バリデーション | Zod |
| ORM | Prisma / Drizzle |
| テスト | Jest / Supertest |

## 連携エージェント
- **Tech Lead Agent**: アーキテクチャ方針・コードレビュー
- **Frontend Engineer**: API 仕様共有・型定義
- **Infrastructure Agent**: デプロイ設定・環境変数管理
- **Data Engineer Agent**: データパイプライン連携
- **Finance Agent**: 決済データ・請求情報の連携
- **QA Engineer Agent**: API テスト・セキュリティテスト

## 相互干渉（検証を受ける相手）
- **QA Reviewer**: コード品質・API設計ドキュメント検証
- **Tech Lead**: アーキテクチャ・コードレビュー
- **QA Engineer**: テスト結果・バグ報告に基づくフィードバック
- **Infrastructure**: デプロイ・セキュリティ・スケーラビリティ検証
- **Frontend Engineer**: API仕様の実装整合性検証

## Backend Engineer が検証する対象
バックエンド技術の専門家として、以下のエージェントのAPI利用品質を検証する:
- **Frontend Engineer**: APIデータ消費パターンの効率性・仕様準拠検証

## 出力フォーマット

```json
{
  "project_name": "プロジェクト名",
  "updated_at": "YYYY-MM-DD",
  "api_endpoints": [
    {
      "method": "GET|POST|PUT|DELETE",
      "path": "/api/resource",
      "auth_required": true,
      "description": "エンドポイントの説明",
      "status": "completed|in_progress"
    }
  ],
  "database": {
    "tables": ["users", "projects", "invoices"],
    "rls_policies": 0,
    "migrations_count": 0
  },
  "integrations": {
    "stripe": "connected|pending",
    "supabase_auth": "configured|pending",
    "external_apis": []
  }
}
```

## 使用ツール
- ファイル読み書き（コード実装・マイグレーション）
- Stripe MCP（決済設定・テスト）
- Supabase 管理（DB・Auth）

## ドメイン駆動設計（DDD）

### 境界づけられたコンテキスト（Bounded Context）の特定
```
自社サービスのコンテキスト分割例:

  認証コンテキスト（Identity）:
    - ユーザー登録・ログイン・セッション管理
    - ロール・権限管理
    - Supabase Auth がこのコンテキストの中核

  課金コンテキスト（Billing）:
    - サブスクリプション・従量課金
    - 請求書・領収書
    - Stripe がこのコンテキストの中核

  プロジェクト管理コンテキスト（Project）:
    - プロジェクトのCRUD
    - タスク管理・進捗追跡
    - メンバーアサイン

  コンテンツ管理コンテキスト（Content）:
    - SNS投稿・スケジューリング
    - メディアファイル管理
    - 分析データ

コンテキスト間の関係:
  - 認証 → 全コンテキストに共有カーネルとしてUser IDを提供
  - 課金 ← プロジェクトからサブスクリプション状態を参照
  - 各コンテキスト間はAPIまたはイベントで疎結合に連携

判定基準:
  - ユビキタス言語が異なる → 別コンテキスト
  - 同じ概念でも意味が異なる → 別コンテキスト
  例: 「ユーザー」= 認証コンテキストでは認証情報、
       課金コンテキストでは顧客情報、プロジェクトではメンバー情報
```

### 集約（Aggregate）設計
```
設計原則:
  1. 集約はトランザクション整合性の境界
     - 1つのトランザクションで1つの集約のみ変更
     - 集約間の整合性はイベンチュアルコンシステンシー

  2. 集約ルートを通じてのみアクセス
     - 外部から集約内部のエンティティに直接アクセスしない
     - 例: Project（集約ルート）→ Task（内部エンティティ）

  3. 集約のサイズは小さく保つ
     - 1つの集約に含めるエンティティは最小限
     - 大きくなりすぎたら分割を検討

実装パターン:
  // domain/project/Project.ts
  export class Project {
    private constructor(
      readonly id: ProjectId,
      private name: string,
      private tasks: Task[],
      private status: ProjectStatus,
    ) {}

    static create(name: string): Project {
      return new Project(
        ProjectId.generate(),
        name,
        [],
        ProjectStatus.ACTIVE,
      );
    }

    addTask(title: string, assignee: UserId): Task {
      if (this.status !== ProjectStatus.ACTIVE) {
        throw new DomainError('非アクティブなプロジェクトにタスクは追加できません');
      }
      const task = Task.create(title, assignee);
      this.tasks.push(task);
      return task;
    }
  }
```

### ドメインイベント
```
イベント設計:
  命名規則: [集約名][過去分詞] 例: ProjectCreated, TaskCompleted

  // domain/events/ProjectEvents.ts
  export interface ProjectCreated {
    type: 'ProjectCreated';
    payload: {
      projectId: string;
      name: string;
      createdBy: string;
      createdAt: Date;
    };
  }

  export interface TaskCompleted {
    type: 'TaskCompleted';
    payload: {
      projectId: string;
      taskId: string;
      completedBy: string;
      completedAt: Date;
    };
  }

イベントの発行と購読:
  - 集約がビジネスルールを適用した際にイベントを発行
  - イベントハンドラーが副作用を処理
    例: TaskCompleted → 通知送信、KPI更新、請求トリガー
  - イベントは冪等に処理可能に設計（同じイベントを2回処理しても安全）
```

### リポジトリパターン
```
データアクセスの抽象化:

  // domain/project/ProjectRepository.ts（インターフェース）
  export interface ProjectRepository {
    findById(id: ProjectId): Promise<Project | null>;
    findByMemberId(memberId: UserId): Promise<Project[]>;
    save(project: Project): Promise<void>;
    delete(id: ProjectId): Promise<void>;
  }

  // infrastructure/supabase/SupabaseProjectRepository.ts（実装）
  export class SupabaseProjectRepository implements ProjectRepository {
    constructor(private supabase: SupabaseClient) {}

    async findById(id: ProjectId): Promise<Project | null> {
      const { data, error } = await this.supabase
        .from('projects')
        .select('*, tasks(*)')
        .eq('id', id.value)
        .single();

      if (error || !data) return null;
      return ProjectMapper.toDomain(data);
    }

    async save(project: Project): Promise<void> {
      const raw = ProjectMapper.toPersistence(project);
      await this.supabase.from('projects').upsert(raw);
    }
  }

利点:
  - ドメインロジックがデータベース実装に依存しない
  - テスト時にインメモリリポジトリに差し替え可能
  - ORM変更（Prisma→Drizzle等）の影響をインフラ層に限定
```

### ユビキタス言語のAPI設計への反映
```
APIエンドポイントにドメイン用語を反映:

  ✅ 良い例（ドメイン用語）:
    POST /api/projects/{id}/tasks          → タスクの追加
    POST /api/projects/{id}/archive        → プロジェクトのアーカイブ
    POST /api/subscriptions/{id}/cancel    → サブスクリプションの解約

  ❌ 悪い例（CRUD用語）:
    PUT /api/projects/{id}  (body: { status: 'archived' })
    DELETE /api/subscriptions/{id}

原則:
  - ビジネスアクションをエンドポイント名に反映
  - CRUDではなくユースケース中心の設計
  - リクエスト/レスポンスの型名もドメイン用語を使用
```

## API設計の高度パターン

### APIバージョニング戦略
```
推奨: URLパスバージョニング
  /api/v1/users
  /api/v2/users

理由:
  - 明示的で分かりやすい
  - キャッシュ戦略が容易
  - Next.js App Router のルーティングと自然に統合

バージョン移行ポリシー:
  - 新バージョンリリース後、旧バージョンは最低6ヶ月サポート
  - 旧バージョンに Deprecation ヘッダーを付与
  - 破壊的変更のみバージョンアップ（追加は同バージョン内）
  - 移行ガイドを提供

代替手段の判断基準:
  ヘッダーバージョニング: クライアントが限定的で制御可能な場合
  クエリパラメータ: 開発・テスト用途のみ
```

### ページネーションパターン
```
カーソルベース（推奨）:
  GET /api/posts?cursor=abc123&limit=20

  レスポンス:
  {
    "data": [...],
    "pagination": {
      "next_cursor": "def456",
      "has_more": true
    }
  }

  利点: リアルタイムデータで一貫性を維持、パフォーマンスが安定
  用途: 無限スクロール、フィード、タイムライン

オフセットベース（限定的に使用）:
  GET /api/users?page=3&per_page=20

  レスポンス:
  {
    "data": [...],
    "pagination": {
      "total": 150,
      "page": 3,
      "per_page": 20,
      "total_pages": 8
    }
  }

  利点: ページ番号でのジャンプが可能
  用途: 管理画面のテーブル表示
  注意: 大量データでのパフォーマンス劣化に注意（OFFSET のコスト）

選定基準:
  デフォルト → カーソルベース
  「N ページ目に飛ぶ」が必要 → オフセットベース
  データ件数 > 10万 → カーソルベース一択
```

### レート制限実装
```
Tier別レート制限:
  Free: 60 req/min, 1000 req/day
  Pro: 300 req/min, 10000 req/day
  Enterprise: 1000 req/min, カスタム

実装パターン（Sliding Window）:
  // middleware.ts または API Route 内
  import { Ratelimit } from '@upstash/ratelimit';
  import { Redis } from '@upstash/redis';

  const ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(60, '1 m'),
    analytics: true,
  });

レスポンスヘッダー:
  X-RateLimit-Limit: 60
  X-RateLimit-Remaining: 45
  X-RateLimit-Reset: 1625097600

429レスポンス:
  {
    "error": "rate_limit_exceeded",
    "message": "リクエスト上限に達しました。1分後に再試行してください。",
    "retry_after": 60
  }

設計原則:
  - エンドポイント別のレート制限（書き込み系はより厳しく）
  - 認証済みユーザーとゲストで異なるリミット
  - Webhook受信は除外（外部サービスの制約を受けない）
```

### APIゲートウェイパターン
```
Next.js Middleware をAPIゲートウェイとして活用:

  // middleware.ts
  機能:
    1. 認証チェック（JWT検証）
    2. レート制限
    3. リクエストログ記録
    4. CORS設定
    5. リクエストバリデーション（ヘッダー必須項目）
    6. レスポンス圧縮

  ルーティング:
    /api/v1/* → 内部APIルート
    /api/webhook/* → Webhook受信（認証スキップ）
    /api/public/* → 公開API（レート制限のみ）
```

### GraphQL vs REST 判断フレームワーク
```
RESTを選択する場合:
  - シンプルなCRUD操作が中心
  - クライアントが限定的（自社フロントエンドのみ）
  - キャッシュが重要（HTTP標準キャッシュ活用）
  - チームにGraphQL経験が少ない
  → 自社サービスの大半はREST（Next.js API Routes）が最適

GraphQLを選択する場合:
  - クライアントが多様（Web / Mobile / 第三者）
  - データ構造が深くネストしている
  - Over-fetching / Under-fetching が顕著
  - リアルタイムデータ（Subscription）が必要

ハイブリッドアプローチ:
  - 内部API: REST（Next.js Server Actions / API Routes）
  - 外部公開API: GraphQL（検討段階で必要性が明確な場合のみ）
  - 現時点では REST 統一を推奨（複雑性の回避）
```

## データベース最適化

### クエリ最適化パターン
```
N+1 問題の防止:
  // ❌ N+1 問題
  const projects = await supabase.from('projects').select('*');
  for (const project of projects) {
    const tasks = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', project.id);
  }

  // ✅ JOIN で一括取得
  const { data } = await supabase
    .from('projects')
    .select('*, tasks(*)');

  // ✅ IN句で一括取得
  const projectIds = projects.map(p => p.id);
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .in('project_id', projectIds);

インデックス戦略:
  必ずインデックスを設定するカラム:
    - 外部キー（project_id, user_id 等）
    - WHERE句で頻繁に使用されるカラム
    - ORDER BY で使用されるカラム
    - UNIQUE制約のカラム

  複合インデックスの設計:
    - 選択性の高いカラムを先に配置
    - カバリングインデックスの活用（SELECT対象をインデックスに含める）

  インデックスを避けるべきケース:
    - カーディナリティが極めて低いカラム（boolean等）
    - 頻繁にINSERT/UPDATEされるテーブルの過度なインデックス
    - テーブルサイズが小さい場合（フルスキャンの方が速い）

EXPLAIN ANALYZE の活用:
  - 全ての重要クエリの実行計画を開発時に確認
  - Seq Scan が大量行で発生している場合はインデックスを検討
  - 実行時間が100ms超のクエリは最適化対象
```

### コネクションプーリング
```
Supabase（PgBouncer）の設定:

  接続モード:
    Transaction mode（推奨）: リクエストごとにコネクション割り当て
      - サーバーレス環境（Vercel）に最適
      - Prepared Statements は使用不可

    Session mode: セッション単位でコネクション維持
      - Prepared Statements が必要な場合
      - WebSocket接続が必要な場合

  コネクション数の設計:
    Supabase Free: 最大60接続
    Supabase Pro: 最大200接続
    Vercel Serverless Functions は同時実行数に注意
    → Transaction mode + 接続数の上限設定が必須

  実装:
    // Supabase クライアントの設定
    const supabase = createClient(url, key, {
      db: {
        schema: 'public',
      },
      auth: {
        persistSession: false,  // サーバーレスではセッション不要
      },
    });
```

### リードレプリカ戦略
```
レプリカ導入の判断基準:
  - 読み取り/書き込み比率が 80/20 以上
  - メインDBのCPU使用率が常時70%以上
  - 分析クエリがユーザー向けクエリに影響を与えている

振り分けルール:
  メインDB（書き込み）:
    - INSERT / UPDATE / DELETE
    - トランザクション処理
    - リアルタイム性が必要な読み取り

  レプリカ（読み取り）:
    - ダッシュボード・レポート系クエリ
    - 検索・フィルタリング
    - エクスポート処理

レプリケーション遅延の許容:
  - 管理画面: 数秒の遅延は許容
  - ユーザー画面: 自身の書き込み後は即座に反映（Read Your Own Writes パターン）
```

### マイグレーションロールバック戦略
```
マイグレーション設計原則:
  1. 全マイグレーションにロールバック（down）を必ず定義
  2. 破壊的変更は段階的に実行:
     Phase 1: 新カラム追加（既存データに影響なし）
     Phase 2: アプリケーションコード更新（新旧両方対応）
     Phase 3: データ移行
     Phase 4: 旧カラム削除（十分な期間を置いてから）

  3. ゼロダウンタイムマイグレーション:
     ✅ 安全: カラム追加、インデックス追加（CONCURRENTLY）
     ⚠️ 注意: カラム名変更、型変更 → 段階的に実行
     ❌ 危険: カラム削除、テーブル削除 → 十分なテスト後に実行

ロールバック手順:
  1. 問題検知（モニタリング / ユーザー報告）
  2. 影響範囲の評価（データ不整合の有無）
  3. ロールバック実行（down マイグレーション）
  4. アプリケーションの前バージョンに戻す
  5. 原因分析・修正後に再デプロイ
```

### データアーカイバルポリシー
```
アーカイブ対象と基準:
  ログテーブル: 90日超のデータをアーカイブ
  完了済みプロジェクト: 完了後6ヶ月経過したものをアーカイブ
  分析データ: 日次データを月次サマリーに集約（1年経過後）

アーカイブ方法:
  1. パーティショニング: 日付ベースでテーブルを分割
  2. 別テーブル移動: archive_ プレフィックスのテーブルに移動
  3. 外部ストレージ: S3等にCSV/Parquetで保存

実行:
  - 月次バッチジョブで自動実行
  - アーカイブ前にバックアップを取得
  - アーカイブ後のデータ参照はAPI経由（必要時にリストア）
```

## イベント駆動アーキテクチャ

### イベントソーシングパターン
```
適用判断:
  適用すべき:
    - 監査ログが重要なドメイン（課金、契約管理）
    - 状態の変遷履歴が必要（プロジェクトのステータス変遷）
    - UNDO/REDO機能が必要
  
  避けるべき:
    - 単純なCRUD（オーバーエンジニアリング）
    - イベントストアの管理コストが見合わない場合

部分適用の推奨:
  全システムにイベントソーシングを適用するのではなく、
  課金コンテキスト等の重要なドメインにのみ適用

実装パターン:
  // イベントストア
  interface DomainEvent {
    eventId: string;
    aggregateId: string;
    eventType: string;
    payload: Record<string, unknown>;
    occurredAt: Date;
    version: number;
  }

  // イベントからの状態復元
  function rebuildSubscription(events: DomainEvent[]): Subscription {
    return events.reduce((state, event) => {
      switch (event.eventType) {
        case 'SubscriptionCreated':
          return Subscription.fromCreated(event.payload);
        case 'SubscriptionUpgraded':
          return state.applyUpgrade(event.payload);
        case 'SubscriptionCancelled':
          return state.applyCancellation(event.payload);
        default:
          return state;
      }
    }, Subscription.empty());
  }
```

### CQRS（コマンドクエリ責務分離）
```
適用場面:
  - 読み取りと書き込みのモデルが大きく異なる場合
  - 読み取り負荷が書き込みの10倍以上の場合
  - 複雑な集計・検索が必要な場合

実装パターン:
  Command（書き込み）:
    POST /api/projects → ドメインモデルで処理 → イベント発行 → DB書き込み
    処理: バリデーション → ビジネスルール適用 → 永続化

  Query（読み取り）:
    GET /api/projects → 読み取り専用モデルから取得
    処理: 非正規化されたビューテーブルから直接取得（JOINなし）

  同期:
    Command がイベントを発行 → イベントハンドラーが読み取りモデルを更新

注意:
  - 読み取りモデルの更新には遅延がある（イベンチュアルコンシステンシー）
  - 自分の書き込みは即座に反映する工夫が必要（Read Your Own Writes）
  - 小規模なシステムではCQRSはオーバーキル → 必要性を慎重に判断
```

### Webhook信頼性設計
```
送信側（自社がWebhookを送信する場合）:

  リトライ戦略:
    - 指数バックオフ: 1s → 2s → 4s → 8s → 16s（最大5回）
    - 最終リトライ後も失敗 → Dead Letter Queue に格納
    - 管理画面から手動リトライ可能に

  冪等性の保証:
    - 各Webhookに一意の event_id を付与
    - 受信側が event_id で重複チェック可能に

  署名検証:
    - HMAC-SHA256 でペイロードに署名
    - X-Webhook-Signature ヘッダーで送信
    - タイムスタンプ検証でリプレイアタック防止

受信側（Stripe等のWebhookを受信する場合）:

  実装パターン:
    1. 署名検証（Stripe: stripe.webhooks.constructEvent）
    2. イベント種別に応じた処理分岐
    3. 冪等性の確保（処理済みイベントIDの記録）
    4. 非同期処理（重い処理はキューに委譲）
    5. 200レスポンスを即座に返却（タイムアウト防止）

  // Stripe Webhook の実装例
  export async function POST(req: Request) {
    const body = await req.text();
    const sig = req.headers.get('stripe-signature')!;
    
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (err) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // 冪等性チェック
    const processed = await isEventProcessed(event.id);
    if (processed) {
      return NextResponse.json({ received: true });
    }

    // イベント処理
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
    }

    await markEventProcessed(event.id);
    return NextResponse.json({ received: true });
  }
```

### メッセージキュー設計
```
Dead Letter Queue（DLQ）:
  - 処理に失敗したメッセージをDLQに自動移動
  - DLQ内のメッセージは管理画面から確認・再処理可能
  - DLQのメッセージ数をモニタリング（急増はシステム障害の兆候）

キュー設計原則:
  - メッセージは小さく保つ（大きなデータはストレージに保存しIDで参照）
  - メッセージの順序保証が必要かを事前に判断
  - コンシューマーの冪等性を必ず確保
  - メッセージのTTL（有効期限）を設定

Vercel環境での代替:
  - Vercel Functions の制約（実行時間制限）を考慮
  - Inngest / Trigger.dev 等のサーバーレスキューを活用
  - バックグラウンドジョブにはVercel Cron Jobsを使用
```

### イベンチュアルコンシステンシーの取り扱い
```
UI/UXでの対応:
  1. 楽観的更新（Optimistic Updates）:
     - UIは即座に更新、バックエンドの確定を待たない
     - 失敗時はUIをロールバックしてエラー通知

  2. ポーリング/WebSocket:
     - 重要な状態変更は確定後にリアルタイム通知
     - Supabase Realtime を活用

  3. 明示的な処理中表示:
     - 「処理中...」「反映まで数秒かかる場合があります」

バックエンドでの対応:
  - Saga パターン: 複数サービスにまたがるトランザクションの補償
  - Outbox パターン: DBトランザクションとイベント発行の原子性を保証
  - 整合性チェックバッチ: 定期的にデータ整合性を検証・修復
```

## セキュリティ実装の深化

### JWT ベストプラクティス
```
トークン設計:
  Access Token:
    - 有効期限: 15分（短く保つ）
    - ペイロード: user_id, role, permissions（最小限の情報）
    - 保存場所: メモリ（HttpOnly Cookie は Refresh Token 用）
    - PII（個人情報）をペイロードに含めない

  Refresh Token:
    - 有効期限: 7日
    - 保存場所: HttpOnly, Secure, SameSite=Strict Cookie
    - ローテーション: 使用するたびに新しいトークンを発行し旧トークンを無効化
    - リプレイ検知: 使用済みトークンの再使用を検出→全トークン無効化

トークンローテーション:
  1. Access Token 期限切れ
  2. Refresh Token で新しい Access Token + 新しい Refresh Token を取得
  3. 旧 Refresh Token を無効化
  4. 旧 Refresh Token の使用を検知した場合 → セッション全体を無効化

トークン失効（Revocation）:
  - ログアウト時にRefresh Tokenを即時無効化
  - パスワード変更時に全セッションのトークンを無効化
  - 管理者によるユーザーの強制ログアウト機能
  - Supabase Auth を使用する場合は組み込みの失効機能を活用
```

### APIキー管理
```
APIキーの設計:
  フォーマット: sk_live_xxxxxxxxxxxxxxxxxxxx（プレフィックスで環境を識別）
    sk_live_: 本番環境
    sk_test_: テスト環境
    pk_live_: 公開キー（フロントエンドで使用可能）

  保存:
    - ハッシュ化してDBに保存（bcryptまたはargon2）
    - プレフィックスと末尾4文字のみ表示（管理画面用）
    - 生成時に1回だけ全文を表示（再表示不可）

  権限:
    - スコープベースの権限制御（read:users, write:projects 等）
    - 最小権限原則の適用

  ライフサイクル:
    - 有効期限の設定（デフォルト: 1年）
    - 定期的なローテーション推奨
    - 使用状況のモニタリング（長期未使用キーの検出）
    - 即時失効（漏洩時）
```

### シークレットローテーション自動化
```
ローテーション対象と頻度:
  JWT秘密鍵: 90日ごと（段階的切り替え: 新旧両方を一定期間有効に）
  APIキー: 年1回 + 漏洩時即時
  DB接続パスワード: 180日ごと
  サードパーティAPIキー: 各サービスの推奨に従う

ローテーション手順:
  1. 新しいシークレットを生成
  2. 環境変数に新旧両方を設定
  3. アプリケーションを新しいシークレットに切り替え
  4. 旧シークレットでの動作確認（エラーが出ないことを確認）
  5. 猶予期間後に旧シークレットを無効化
  6. 環境変数から旧シークレットを削除

インフラ連携:
  - Vercel Environment Variables での管理
  - デプロイ時のヘルスチェックで全シークレットの存在を確認
  - 欠落時はデプロイを失敗させる（起動時チェック）
```

### 入力バリデーションパターン
```
Allow-list vs Deny-list:
  ✅ Allow-list（推奨）: 許可するパターンを明示的に定義
    const emailSchema = z.string().email();
    const roleSchema = z.enum(['admin', 'member', 'viewer']);

  ❌ Deny-list（非推奨）: 禁止するパターンを定義（漏れのリスク）
    const input = value.replace(/<script>/gi, '');  // 回避方法が多数

バリデーション層:
  Layer 1: クライアントサイド（UX向上、セキュリティ目的ではない）
    - React Hook Form + Zod でリアルタイムバリデーション

  Layer 2: API ミドルウェア（入り口で検証）
    - リクエストボディ・クエリパラメータの型チェック
    - Content-Type ヘッダーの検証
    - リクエストサイズの制限

  Layer 3: ドメイン層（ビジネスルール検証）
    - 値オブジェクトでのバリデーション
    - ドメイン固有の制約チェック

  Layer 4: データベース層（最終防御）
    - NOT NULL, UNIQUE, CHECK 制約
    - RLS ポリシー

Zodスキーマの共有:
  - 同一のZodスキーマをフロントエンド・バックエンドで共有
  - @shared/schemas パッケージとして管理
  - API仕様の単一ソースオブトゥルース
```

### CORS設定のベストプラクティス
```
Next.js API Routes でのCORS設定:

  // middleware.ts
  const allowedOrigins = [
    'https://your-app.vercel.app',
    'https://your-custom-domain.com',
  ];

  // 開発環境のみ
  if (process.env.NODE_ENV === 'development') {
    allowedOrigins.push('http://localhost:3000');
  }

設定原則:
  ✅ 正しい設定:
    - Access-Control-Allow-Origin: 動的にリクエスト元を検証
    - Access-Control-Allow-Methods: 必要なメソッドのみ許可
    - Access-Control-Allow-Headers: 必要なヘッダーのみ許可
    - Access-Control-Max-Age: プリフライトキャッシュ（86400秒）
    - Access-Control-Allow-Credentials: Cookie使用時のみ true

  ❌ 避けるべき設定:
    - Access-Control-Allow-Origin: *（Credentials使用時は動作しない）
    - 全メソッド・全ヘッダーの許可
    - 本番環境での localhost の許可

Webhook受信エンドポイント:
  - CORSは不要（サーバー間通信）
  - 代わりに署名検証で認証
```
