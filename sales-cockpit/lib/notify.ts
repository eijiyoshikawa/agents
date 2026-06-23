// Slack通知（Incoming Webhook）。SLACK_WEBHOOK_URL 未設定なら何もしない。MCP不要・コスト0。

export async function notifySlack(text: string): Promise<void> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch {
    /* 通知失敗は致命的ではない */
  }
}

export async function notifyAppointment(input: { customerName: string; rep: string; memo?: string }): Promise<void> {
  const memo = input.memo ? `\n${input.memo}` : "";
  await notifySlack(`🎉 アポ獲得！ *${input.customerName}*（担当: ${input.rep}）${memo}`);
}
