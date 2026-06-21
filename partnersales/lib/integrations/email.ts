// メール送信（Resend）。登録時にログイン情報をパートナーへ送る。
// RESEND_API_KEY / EMAIL_FROM 未設定、または宛先が無い場合は送信せず stub を返す。
// 送信できなかった場合は管理画面にパスワードを表示し、スタッフが手動連絡できる。

export interface SendResult {
  sent: boolean;
  note?: string;
}

export interface CredentialMail {
  to: string;
  companyName: string;
  loginId: string;
  password: string;
}

export function hasEmailConfig(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendCredentialsEmail(mail: CredentialMail): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const loginUrl = (process.env.APP_URL || "").replace(/\/$/, "") + "/login";

  if (!key || !from) return { sent: false, note: "メール未設定（RESEND_API_KEY / EMAIL_FROM）" };
  if (!mail.to) return { sent: false, note: "宛先メールアドレスが未入力" };

  const text = [
    `${mail.companyName} 御中`,
    "",
    "紹介パートナー登録が完了しました。以下のログイン情報でマイページにアクセスできます。",
    "",
    `ログインID: ${mail.loginId}`,
    `パスワード: ${mail.password}`,
    process.env.APP_URL ? `ログインURL: ${loginUrl}` : "ログインページからログインしてください。",
    "",
    "※ このメールは大切に保管してください。パスワードはお問い合わせいただいても再発行となります。",
  ].join("\n");

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: mail.to,
        subject: "【PartnerSales】ログイン情報のご案内",
        text,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { sent: false, note: `メール送信エラー: ${res.status} ${body}` };
    }
    return { sent: true };
  } catch (e) {
    return { sent: false, note: `メール送信例外: ${e instanceof Error ? e.message : String(e)}` };
  }
}
