import Link from "next/link";
import {
  FolderOpen, ShieldAlert, ExternalLink, FolderTree, Tag, Users, Clock,
  CheckCircle2, AlertCircle, ArrowRight,
} from "lucide-react";
import drive from "@/data/drive.json";
import agents from "@/data/agents.json";
import SectionGate from "@/components/SectionGate";

const TAG_STYLE: Record<string, string> = {
  confidential: "pill-red",
  "admin-only": "pill-amber",
  "personal-data": "pill-violet",
  "customer-data": "pill-indigo",
};

export default function DrivePage() {
  const agentsMap = Object.fromEntries((agents as any[]).map((a) => [a.id, a]));
  const folders = (drive as any).folders ?? [];

  return (
    <div className="space-y-6">
      <header className="card relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent-indigo via-brand-glow to-accent-teal" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FolderOpen className="w-4 h-4 text-[var(--fg-muted)]" />
              <span className="h-section">基幹データ</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Google Drive</h1>
            <p className="text-sm text-[var(--fg-muted)] mt-1">
              {(drive as any).rootFolderName} · {folders.length} フォルダ
            </p>
          </div>
          <ConnectionBadge status={(drive as any).integration?.status} />
        </div>
      </header>

      <SectionGate id="drive.integration">
        <section className="card">
          <h2 className="font-semibold mb-2 flex items-center gap-2"><ShieldAlert className="w-4 h-4" /> 連携ステータス</h2>
          <p className="text-sm text-[var(--fg-soft)]">
            現在は <strong>マニフェスト方式</strong>（<code className="text-xs">config/drive-manifest.json</code>）で運用しています。
            実 Drive と接続するには、下記の Service Account を共有ドライブにビューワー権限で追加し、
            <code className="text-xs">scripts/scan-drive.mjs</code>（後続実装）で自動同期に切り替えます。
          </p>
          <div className="grid md:grid-cols-3 gap-3 mt-4">
            <Info label="Sync モード" value={(drive as any).syncMode} />
            <Info label="最終同期" value={(drive as any).lastSyncedAt} />
            <Info label="次のステップ" value={(drive as any).integration?.nextStep} />
          </div>
        </section>
      </SectionGate>

      <section>
        <h2 className="font-semibold mb-3 flex items-center gap-2"><FolderTree className="w-4 h-4" /> フォルダ構成</h2>
        <div className="grid md:grid-cols-2 gap-3">
          {folders.map((f: any, i: number) => {
            const owner = agentsMap[f.owner];
            return (
              <div key={f.id} id={f.id} className="card card-hover animate-growFromBottom" style={{ animationDelay: `${i * 40}ms` }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-5 h-5 text-accent-indigo" />
                    <div>
                      <div className="text-base font-semibold">{f.name}</div>
                      <div className="text-[10px] text-[var(--fg-muted)] font-mono mt-0.5">{f.id}</div>
                    </div>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-[var(--fg-muted)] opacity-50" />
                </div>
                {f.description ? <p className="text-xs text-[var(--fg-soft)] mt-2">{f.description}</p> : null}

                {(f.tags ?? []).length > 0 ? (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {f.tags.map((t: string) => (
                      <span key={t} className={`pill ${TAG_STYLE[t] ?? ""}`}>
                        <Tag className="w-2.5 h-2.5" /> {t}
                      </span>
                    ))}
                  </div>
                ) : null}

                {f.subfolders?.length > 0 ? (
                  <div className="mt-3">
                    <div className="text-[10px] uppercase text-[var(--fg-muted)] mb-1">サブフォルダ</div>
                    <div className="flex flex-wrap gap-1">
                      {f.subfolders.map((s: string) => (
                        <span key={s} className="pill text-[10px]">{s}</span>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--card-border)" }}>
                  <div className="text-[10px] uppercase text-[var(--fg-muted)] mb-1 flex items-center gap-1">
                    <Users className="w-3 h-3" /> 関係エージェント
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {f.owner ? (
                      <Link href={`/agents/${encodeURIComponent(f.owner)}`} className="pill pill-brand text-[10px]">
                        👑 {owner?.name ?? f.owner}
                      </Link>
                    ) : null}
                    {(f.agents ?? []).slice(0, 5).map((aid: string) => (
                      <Link key={aid} href={`/agents/${encodeURIComponent(aid)}`} className="pill text-[10px] hover:pill-brand">
                        {agentsMap[aid]?.name ?? aid}
                      </Link>
                    ))}
                    {(f.agents ?? []).length > 5 ? (
                      <span className="pill text-[10px]">+{f.agents.length - 5}</span>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <SectionGate id="drive.setup">
        <section className="card">
          <h2 className="font-semibold mb-3">本番連携への切替手順</h2>
          <ol className="text-sm text-[var(--fg-soft)] space-y-2.5 list-decimal pl-5">
            <li>Google Cloud で <strong>Service Account</strong> を作成し、JSON キーをダウンロード</li>
            <li>共有ドライブ「{(drive as any).rootFolderName}」のメンバーに Service Account のメールを <strong>閲覧者</strong> として追加</li>
            <li><code className="text-xs">.env.local</code> に <code className="text-xs">GOOGLE_SERVICE_ACCOUNT_KEY</code> と <code className="text-xs">GOOGLE_DRIVE_FOLDER_ID</code> を設定</li>
            <li><code className="text-xs">npm run scan</code>（または GitHub Actions の <code className="text-xs">deploy-console.yml</code>）で <code className="text-xs">scripts/scan-drive.mjs</code> を起動し、メタデータを取得</li>
            <li>取得結果は <code className="text-xs">data/drive.json</code> に書き出され、本ページに自動反映される</li>
          </ol>
          <div className="text-xs text-[var(--fg-muted)] mt-4 leading-relaxed">
            ※ MVP では同期スクリプトは未実装です。マニフェスト（<code>config/drive-manifest.json</code>）を手で編集して同等の表示が得られるようにしてあります。
          </div>
        </section>
      </SectionGate>

      <SectionGate id="drive.required-scopes">
        <section className="card">
          <h2 className="font-semibold mb-3">権限スコープ</h2>
          <ul className="text-sm space-y-1">
            {((drive as any).integration?.requiredScopes ?? []).map((s: string) => (
              <li key={s} className="font-mono text-xs flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-brand-glow" /> {s}
              </li>
            ))}
          </ul>
          <p className="text-xs text-[var(--fg-muted)] mt-3">
            <AlertCircle className="w-3.5 h-3.5 inline mr-1" />
            メタデータ（フォルダ・ファイル名・更新日時）のみ取得します。本文には触れません。
          </p>
        </section>
      </SectionGate>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <div className="h-section flex items-center gap-1"><Clock className="w-3 h-3" /> {label}</div>
      <div className="text-sm mt-1 break-words">{value ?? "—"}</div>
    </div>
  );
}

function ConnectionBadge({ status }: { status?: string }) {
  const isConnected = status === "connected";
  return (
    <div className="pill pill-amber">
      {isConnected ? <span className="live-dot" /> : <AlertCircle className="w-3.5 h-3.5" />}
      {isConnected ? "接続中" : "マニフェスト方式（API未接続）"}
      <ArrowRight className="w-3 h-3" />
    </div>
  );
}
