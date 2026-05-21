"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { createBulletinSchema } from "@/lib/validations/bulletin";
import { CATEGORY_CONFIG } from "@/lib/types/database";
import type { BulletinCategory } from "@/lib/types/database";
import { toast } from "sonner";
import { Send } from "lucide-react";

export default function NewBulletinPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<BulletinCategory>("general");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const result = createBulletinSchema.safeParse({ title, content, category });
    if (!result.success) {
      const firstError = result.error.issues[0];
      toast.error(firstError.message);
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("ログインが必要です");
      setLoading(false);
      return;
    }

    // Get user's organization
    const { data: membership } = await supabase
      .from("memberships")
      .select("organization_id")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!membership) {
      toast.error("管理者権限がありません");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("bulletins").insert({
      organization_id: membership.organization_id,
      author_id: user.id,
      title: result.data.title,
      content: result.data.content,
      category: result.data.category,
      priority: result.data.priority,
      is_draft: false,
      published_at: new Date().toISOString(),
    });

    setLoading(false);

    if (error) {
      toast.error("投稿に失敗しました");
      return;
    }

    toast.success("投稿しました");
    router.push("/");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-neutral-900">新しいお知らせ</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          label="タイトル"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="お知らせのタイトル"
          required
          maxLength={100}
        />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="category" className="text-base font-semibold text-neutral-700">
            カテゴリ <span className="text-error" aria-hidden="true">*</span>
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value as BulletinCategory)}
            className="w-full min-h-14 px-4 text-lg rounded-xl border-2 border-neutral-200 bg-white focus:border-primary-500 focus:outline-none"
          >
            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>
                {config.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="content" className="text-base font-semibold text-neutral-700">
            本文 <span className="text-error" aria-hidden="true">*</span>
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="お知らせの内容を入力してください"
            rows={8}
            required
            maxLength={10000}
            className="w-full px-4 py-3 text-lg rounded-xl border-2 border-neutral-200 bg-white resize-y focus:border-primary-500 focus:outline-none leading-relaxed"
          />
          <span className="text-sm text-neutral-500 text-right">
            {content.length} / 10,000
          </span>
        </div>

        <Button type="submit" fullWidth loading={loading}>
          <Send className="size-5" aria-hidden="true" />
          投稿する
        </Button>
      </form>
    </div>
  );
}
