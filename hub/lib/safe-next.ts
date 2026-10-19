/** ログイン後の遷移先をサイト内パスに限定する（オープンリダイレクト対策） */
export function safeNext(next: string | undefined | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}
