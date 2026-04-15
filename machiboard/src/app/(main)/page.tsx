"use client";

import { useState, useEffect } from "react";
import { BulletinCard } from "@/components/bulletin/bulletin-card";
import { CategoryFilter } from "@/components/bulletin/category-filter";
import { createClient } from "@/lib/supabase/client";
import { FileText } from "lucide-react";
import type { Bulletin, BulletinCategory } from "@/lib/types/database";

export default function HomePage() {
  const [bulletins, setBulletins] = useState<Bulletin[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<BulletinCategory | "all">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBulletins() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from("bulletins")
        .select(`
          *,
          author:profiles!bulletins_author_id_fkey(display_name),
          read_confirmations(user_id)
        `)
        .eq("is_draft", false)
        .order("published_at", { ascending: false })
        .limit(50);

      if (selectedCategory !== "all") {
        query = query.eq("category", selectedCategory);
      }

      const { data } = await query;

      if (data) {
        const enriched: Bulletin[] = data.map((b) => ({
          ...b,
          image_urls: b.image_urls ?? [],
          attachment_urls: b.attachment_urls ?? [],
          author: Array.isArray(b.author) ? b.author[0] : b.author,
          is_read: Array.isArray(b.read_confirmations)
            ? b.read_confirmations.some(
                (r: { user_id: string }) => r.user_id === user.id
              )
            : false,
          read_count: Array.isArray(b.read_confirmations)
            ? b.read_confirmations.length
            : 0,
        }));
        setBulletins(enriched);
      }
      setLoading(false);
    }

    fetchBulletins();
  }, [selectedCategory]);

  if (loading) {
    return (
      <div className="space-y-4">
        <CategoryFilter selected={selectedCategory} onChange={setSelectedCategory} />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 bg-neutral-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <CategoryFilter selected={selectedCategory} onChange={setSelectedCategory} />

      {bulletins.length === 0 ? (
        <div className="text-center py-16 space-y-4">
          <FileText className="size-16 text-neutral-300 mx-auto" aria-hidden="true" />
          <p className="text-xl text-neutral-500">お知らせはまだありません</p>
        </div>
      ) : (
        <div className="space-y-3" role="feed" aria-label="回覧板一覧">
          {bulletins.map((bulletin) => (
            <BulletinCard key={bulletin.id} bulletin={bulletin} />
          ))}
        </div>
      )}
    </div>
  );
}
