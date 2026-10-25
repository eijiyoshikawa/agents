import { unstable_cache } from "next/cache";
import { randomUUID } from "node:crypto";

// ── 大きなデータ用のキャッシュ（2MB超対策） ──────────────────────────
// Next.js のデータキャッシュ（unstable_cache）は 1 エントリ 2MB が上限で、超えると保存されず毎回取り直しになる。
// 本番ログで「全顧客の軽量版 ≈16MB」「着手済み顧客 ≈3.1MB」が保存に失敗していた
// （"items over 2MB can not be cached"）＝ 架電一覧以外の全件系ページ・ダッシュボードが毎回 DB/Notion から全件取得していた。
// そこでデータ本体はインスタンスのメモリに持ち、データキャッシュには「版ID」（数十バイト）だけを置く。
//   - 版IDは unstable_cache と同じタグ・TTL で管理するため、revalidateTag（保存・同期・更新ボタン）で版が変わり、
//     各インスタンスは次の読み込みで取り直す。鮮度は従来の unstable_cache と同じ（タグ無効化は即時・TTL は同じ秒数）。
//   - 同じ版の同時読み込みは 1 回の取得にまとめる。
// 返り値は全リクエストで共有するため、呼び出し側で配列・要素を書き換えないこと（filter/map で新しい配列を作る）。
export function versionedMemo<T>(
  load: () => Promise<T>,
  key: string,
  opts: { revalidate: number; tags: string[] },
): () => Promise<T> {
  const currentVersion = unstable_cache(async () => randomUUID(), [key, "version"], opts);
  let memo: { v: string; value: T } | null = null;
  let inflight: { v: string; p: Promise<T> } | null = null;

  return async () => {
    const v = await currentVersion();
    if (memo?.v === v) return memo.value;
    if (inflight?.v !== v) {
      const p = load()
        .then((value) => {
          memo = { v, value };
          return value;
        })
        .finally(() => {
          if (inflight?.p === p) inflight = null;
        });
      inflight = { v, p };
    }
    return inflight.p;
  };
}
