import { AlertCircle, Lightbulb, MessageSquareText, TrendingUp } from "lucide-react";
import type { UseCase } from "@/data/useCases";

export default function UseCaseCard({ uc }: { uc: UseCase }) {
  return (
    <div className="rounded-2xl border border-surface-border bg-white p-6 shadow-sm transition hover:shadow-md">
      <h3 className="mb-4 text-lg font-bold text-primary">
        <span className="mr-2 inline-block rounded-full bg-accent/10 px-2.5 py-0.5 text-sm font-semibold text-accent">
          {String(uc.id).padStart(2, "0")}
        </span>
        {uc.title}
      </h3>

      <div className="space-y-3 text-sm leading-relaxed text-foreground/80">
        <div className="flex gap-2">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <div>
            <span className="font-semibold text-red-500">課題：</span>
            {uc.problem}
          </div>
        </div>

        <div className="flex gap-2">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          <div>
            <span className="font-semibold text-accent">AI解決策：</span>
            {uc.solution}
          </div>
        </div>

        <div className="flex gap-2">
          <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0 text-primary-light" />
          <div>
            <span className="font-semibold text-primary-light">具体例：</span>
            {uc.example}
          </div>
        </div>

        <div className="flex gap-2 rounded-lg bg-surface px-3 py-2">
          <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
          <div>
            <span className="font-semibold text-green-700">期待効果：</span>
            {uc.effect}
          </div>
        </div>
      </div>
    </div>
  );
}
