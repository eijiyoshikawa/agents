import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { googleEnabled } from "@/auth.config";
import { safeNext } from "@/lib/safe-next";
import { loginWithGoogle, loginWithPassword } from "./actions";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  CredentialsSignin: "メールアドレスまたはパスワードが違います。",
  AccessDenied: "このアカウントはハブに登録されていません。管理者にメンバー登録を依頼してください。",
  Configuration: "認証の設定に問題があります。管理者に連絡してください。",
  Default: "ログインに失敗しました。もう一度お試しください。",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const session = await auth();
  const params = await searchParams;
  const next = safeNext(params.next);
  if (session?.user?.email) redirect(next);
  const error = params.error ? ERROR_MESSAGES[params.error] ?? ERROR_MESSAGES.Default : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <div className="card p-8 animate-grow-from-bottom motion-reduce:animate-none">
        <div className="text-xs tracking-widest text-ink/50">株式会社LET</div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">経営ハブ</h1>
        <p className="mt-3 text-sm text-ink/70 leading-relaxed">登録済みのメンバーのみ利用できます。</p>
        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        )}
        <form className="mt-6 space-y-4" action={loginWithPassword}>
          <input type="hidden" name="next" value={next} />
          <label className="block text-sm">
            <span className="text-ink/70">メールアドレス</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="username"
              className="mt-1 w-full rounded-lg border border-ink/15 bg-white px-3 py-2 focus:outline-none focus:border-brand"
            />
          </label>
          <label className="block text-sm">
            <span className="text-ink/70">パスワード</span>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="mt-1 w-full rounded-lg border border-ink/15 bg-white px-3 py-2 focus:outline-none focus:border-brand"
            />
          </label>
          <button className="w-full rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-white hover:bg-brand-dark transition-colors duration-300 ease-standard">
            ログイン
          </button>
        </form>
        {googleEnabled && (
          <form className="mt-4" action={loginWithGoogle}>
            <input type="hidden" name="next" value={next} />
            <button className="w-full rounded-lg border border-ink/15 px-4 py-3 text-sm font-semibold text-ink hover:bg-ink/5 transition-colors duration-300 ease-standard">
              Google でログイン
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
