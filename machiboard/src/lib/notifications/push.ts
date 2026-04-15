export async function sendPushNotification(
  subscription: { endpoint: string; keys: Record<string, string> },
  title: string,
  body: string,
  bulletinId: string
) {
  // Web Push requires the `web-push` npm package for VAPID signing.
  // For MVP, this is a placeholder that logs the notification.
  // In production, install `web-push` and configure VAPID keys.
  //
  // Example with web-push:
  // import webPush from "web-push";
  // webPush.setVapidDetails(
  //   "mailto:admin@machiboard.jp",
  //   process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  //   process.env.VAPID_PRIVATE_KEY!
  // );
  // await webPush.sendNotification(subscription, JSON.stringify({ title, body, url }));

  const payload = {
    title,
    body,
    data: { url: `/bulletin/${bulletinId}` },
    icon: "/icons/icon-192x192.png",
    badge: "/icons/badge-72x72.png",
  };

  console.log("[Push] Would send notification:", JSON.stringify(payload).slice(0, 200));

  // When web-push is configured:
  // try {
  //   await webPush.sendNotification(subscription, JSON.stringify(payload));
  // } catch (err) {
  //   console.error("[Push] Failed:", err);
  // }
}
