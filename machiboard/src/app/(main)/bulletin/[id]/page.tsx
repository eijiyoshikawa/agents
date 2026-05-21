import { createClient } from "@/lib/supabase/server";
import { CategoryBadge } from "@/components/ui/badge";
import { ReadConfirmButton } from "@/components/bulletin/read-confirm-button";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("bulletins")
    .select("title")
    .eq("id", id)
    .single();

  return {
    title: data?.title ?? "回覧板",
  };
}

export default async function BulletinDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: bulletin } = await supabase
    .from("bulletins")
    .select(`
      *,
      author:profiles!bulletins_author_id_fkey(display_name)
    `)
    .eq("id", id)
    .single();

  if (!bulletin) notFound();

  const { data: readConfirmation } = await supabase
    .from("read_confirmations")
    .select("id")
    .eq("bulletin_id", id)
    .eq("user_id", user.id)
    .single();

  const isRead = !!readConfirmation;
  const author = Array.isArray(bulletin.author)
    ? bulletin.author[0]
    : bulletin.author;

  return (
    <article className="space-y-6 pb-24">
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <CategoryBadge category={bulletin.category} />
          {bulletin.priority === "urgent" && (
            <span className="text-base font-bold text-error">緊急</span>
          )}
        </div>

        <h1 className="text-2xl font-bold text-neutral-900 leading-snug">
          {bulletin.title}
        </h1>

        <div className="flex items-center gap-3 text-base text-neutral-500">
          <span>{author?.display_name ?? "管理者"}</span>
          <span aria-hidden="true">|</span>
          <time dateTime={bulletin.published_at ?? bulletin.created_at}>
            {format(
              new Date(bulletin.published_at ?? bulletin.created_at),
              "yyyy年M月d日 HH:mm",
              { locale: ja }
            )}
          </time>
        </div>
      </div>

      <div className="prose prose-lg max-w-none text-neutral-800 leading-relaxed whitespace-pre-wrap">
        {bulletin.content}
      </div>

      {bulletin.image_urls && bulletin.image_urls.length > 0 && (
        <div className="space-y-3">
          {bulletin.image_urls.map((url: string, i: number) => (
            <img
              key={i}
              src={url}
              alt={`添付画像 ${i + 1}`}
              className="w-full rounded-xl"
              loading="lazy"
            />
          ))}
        </div>
      )}

      {bulletin.pdf_url && (
        <a
          href={bulletin.pdf_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-primary-500 underline text-lg"
        >
          PDF版をダウンロード
        </a>
      )}

      <ReadConfirmButton bulletinId={id} initialIsRead={isRead} />
    </article>
  );
}
