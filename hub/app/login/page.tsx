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
      <div className="mb-6 flex items-center gap-2.5 font-extrabold tracking-wide text-ink">
        <i aria-hidden className="h-2.5 w-2.5 rounded-full bg-brand shadow-[0_0_0_3px_rgba(59,130,246,0.25)]" />
        LET 経営ハブ
      </div>
      <div className="card p-8 animate-grow-from-bottom motion-reduce:animate-none">
        <div className="text-xs tracking-widest text-ink-3">株式会社LET</div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">ログイン</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-2">登録済みのメンバーのみ利用できます。役員・管理職・一般、すべて同じ入口です。</p>
        {error && (
          <p role="alert" className="alert-risk mt-4">
            {error}
          </p>
        )}
        <form className="mt-6 space-y-4" action={loginWithPassword}>
          <input type="hidden" name="next" value={next} />
          <label className="block text-sm">
            <span className="text-ink-2">メールアドレス</span>
            <input name="email" type="email" required autoComplete="username" className="input" />
          </label>
          <label className="block text-sm">
            <span className="text-ink-2">パスワード</span>
            <input name="password" type="password" required autoComplete="current-password" className="input" />
          </label>
          <button className="btn-primary w-full py-3">ログイン</button>
        </form>
        {googleEnabled && (
          <form className="mt-4" action={loginWithGoogle}>
            <input type="hidden" name="next" value={next} />
            <button className="btn-ghost w-full py-3 text-sm font-semibold">Google でログイン</button>
          </form>
        )}
        <p className="mt-6 text-xs leading-relaxed text-ink-3">
          初回ログイン後はパスワードの変更を求めます。ログインできない場合は管理者（役員）にメンバー登録を依頼してください。
        </p>
      </div>
    </main>
  );
}
