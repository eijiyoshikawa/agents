import type { SupabaseClient } from "@supabase/supabase-js";

export async function sendEmail(
  supabase: SupabaseClient,
  userId: string,
  title: string,
  body: string,
  bulletinId: string
) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[Email] RESEND_API_KEY not configured, skipping");
    return;
  }

  const { data: user } = await supabase.auth.admin.getUserById(userId);
  const email = user?.user?.email;
  if (!email) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const bulletinUrl = `${appUrl}/bulletin/${bulletinId}`;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "まちボード <noreply@machiboard.jp>",
        to: email,
        subject: title,
        html: `
          <div style="font-family: 'Noto Sans JP', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
            <h1 style="color: #1A5276; font-size: 24px; margin-bottom: 16px;">${title}</h1>
            <p style="font-size: 18px; line-height: 1.8; color: #374151;">${body}...</p>
            <a href="${bulletinUrl}"
               style="display: inline-block; margin-top: 24px; padding: 16px 32px; background: #2980B9; color: white; text-decoration: none; border-radius: 12px; font-size: 18px; font-weight: 600;">
              詳しく見る
            </a>
            <hr style="margin-top: 32px; border: none; border-top: 1px solid #E5E7EB;" />
            <p style="font-size: 14px; color: #6B7280;">
              このメールはまちボードから自動送信されています。
            </p>
          </div>
        `,
      }),
    });
  } catch (err) {
    console.error("[Email] Failed to send:", err);
  }
}
