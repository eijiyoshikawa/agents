// Slack通知（Incoming Webhook）。SLACK_WEBHOOK_URL 未設定なら何もしない。MCP不要・コスト0。

export type SlackResult = { ok: boolean; skipped?: boolean; status?: number; error?: string };

export async function notifySlack(text: string): Promise<SlackResult> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return { ok: false, skipped: true };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (res.ok) return { ok: true, status: res.status };
    const body = await res.text().catch(() => "");
    return { ok: false, status: res.status, error: body.slice(0, 200) };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "送信失敗" };
  }
}

export async function notifyAppointment(input: { customerName: string; rep: string; memo?: string }): Promise<void> {
  const memo = input.memo ? `\n${input.memo}` : "";
  await notifySlack(`🎉 アポ獲得！ *${input.customerName}*（担当: ${input.rep}）${memo}`);
}
