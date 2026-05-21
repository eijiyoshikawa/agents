"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface ReadConfirmButtonProps {
  bulletinId: string;
  initialIsRead: boolean;
}

export function ReadConfirmButton({ bulletinId, initialIsRead }: ReadConfirmButtonProps) {
  const [isRead, setIsRead] = useState(initialIsRead);
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    if (isRead) return;

    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast.error("ログインが必要です");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("read_confirmations").upsert(
      { bulletin_id: bulletinId, user_id: user.id },
      { onConflict: "bulletin_id,user_id" }
    );

    setLoading(false);

    if (error) {
      toast.error("確認に失敗しました");
      return;
    }

    setIsRead(true);
    toast.success("確認しました");
  }

  if (isRead) {
    return (
      <div className="fixed bottom-20 left-0 right-0 z-30 px-4 pb-2 md:bottom-4">
        <div className="max-w-3xl mx-auto">
          <Button
            variant="read-confirm"
            fullWidth
            disabled
            className="bg-success cursor-default opacity-100"
            aria-pressed="true"
          >
            <Check className="size-6" aria-hidden="true" />
            確認済み
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-20 left-0 right-0 z-30 px-4 pb-2 md:bottom-4">
      <div className="max-w-3xl mx-auto">
        <Button
          variant="read-confirm"
          fullWidth
          loading={loading}
          onClick={handleConfirm}
          aria-pressed="false"
        >
          読みました
        </Button>
      </div>
    </div>
  );
}
