"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Bell, Type, LogOut } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const router = useRouter();
  const [fontSize, setFontSize] = useState<string>("default");
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  function handleFontSizeChange(size: string) {
    setFontSize(size);
    document.documentElement.setAttribute("data-font-size", size);
    toast.success("文字サイズを変更しました");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-neutral-900">設定</h1>

      <Card>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Bell className="size-6 text-primary-500" aria-hidden="true" />
            <h2 className="text-lg font-bold text-neutral-900">通知設定</h2>
          </div>

          <div className="space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-lg text-neutral-700">プッシュ通知</span>
              <button
                type="button"
                role="switch"
                aria-checked={pushEnabled}
                onClick={() => setPushEnabled(!pushEnabled)}
                className={`relative w-14 h-8 rounded-full transition-colors ${pushEnabled ? "bg-primary-500" : "bg-neutral-300"}`}
              >
                <span className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-transform ${pushEnabled ? "left-7" : "left-1"}`} />
              </button>
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-lg text-neutral-700">メール通知</span>
              <button
                type="button"
                role="switch"
                aria-checked={emailEnabled}
                onClick={() => setEmailEnabled(!emailEnabled)}
                className={`relative w-14 h-8 rounded-full transition-colors ${emailEnabled ? "bg-primary-500" : "bg-neutral-300"}`}
              >
                <span className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-transform ${emailEnabled ? "left-7" : "left-1"}`} />
              </button>
            </label>
          </div>
        </div>
      </Card>

      <Card>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Type className="size-6 text-primary-500" aria-hidden="true" />
            <h2 className="text-lg font-bold text-neutral-900">表示設定</h2>
          </div>

          <div className="space-y-2">
            <p className="text-base text-neutral-700">文字の大きさ</p>
            <div className="flex gap-2">
              {[
                { key: "default", label: "標準", sample: "text-lg" },
                { key: "large", label: "大きめ", sample: "text-xl" },
                { key: "xlarge", label: "最大", sample: "text-2xl" },
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => handleFontSizeChange(opt.key)}
                  className={`flex-1 py-3 px-2 rounded-xl border-2 text-center font-semibold transition-colors cursor-pointer ${
                    fontSize === opt.key
                      ? "border-primary-500 bg-primary-50 text-primary-700"
                      : "border-neutral-200 text-neutral-700 hover:border-neutral-300"
                  }`}
                >
                  <span className={opt.sample}>あ</span>
                  <br />
                  <span className="text-sm">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Button variant="outline" fullWidth onClick={handleLogout} className="text-error border-error hover:bg-red-50">
        <LogOut className="size-5" aria-hidden="true" />
        ログアウト
      </Button>
    </div>
  );
}
