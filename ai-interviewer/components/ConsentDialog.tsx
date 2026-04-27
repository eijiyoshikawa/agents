"use client";

interface Props {
  onAgree: () => void;
}

export function ConsentDialog({ onAgree }: Props) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 px-4">
      <div className="max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold">面接開始前のご確認</h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-700">
          本面接はAI面接官による一次面接です。以下の点にご同意の上、開始してください。
        </p>
        <ul className="mt-4 list-disc space-y-1.5 pl-5 text-sm text-slate-700">
          <li>音声・映像はリアルタイムで処理されます。</li>
          <li>会話のテキスト記録と評価結果はNotionに保存されます。</li>
          <li>記録は採用判断の参考にのみ使用し、30日後に削除されます。</li>
          <li>マイクへのアクセス許可をブラウザから求められます。</li>
        </ul>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onAgree}
            className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white"
          >
            同意して進む
          </button>
        </div>
      </div>
    </div>
  );
}
