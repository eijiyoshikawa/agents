import type { SupabaseClient } from "@supabase/supabase-js";
import type { Bulletin } from "@/lib/types/database";
import { sendEmail } from "./email";
import { sendPushNotification } from "./push";

export async function dispatchNotifications(
  supabase: SupabaseClient,
  organizationId: string,
  bulletin: Bulletin
) {
  const { data: members } = await supabase
    .from("memberships")
    .select("user_id")
    .eq("organization_id", organizationId);

  if (!members || members.length === 0) return;

  const userIds = members.map((m) => m.user_id);

  const { data: preferences } = await supabase
    .from("notification_preferences")
    .select("*")
    .in("user_id", userIds);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id")
    .in("id", userIds);

  const prefMap = new Map(
    (preferences ?? []).map((p) => [p.user_id, p])
  );

  const emailTargets: string[] = [];
  const pushTargets: Array<{ endpoint: string; keys: Record<string, string> }> = [];

  for (const uid of userIds) {
    if (uid === bulletin.author_id) continue;

    const pref = prefMap.get(uid);
    if (!pref) {
      emailTargets.push(uid);
      continue;
    }

    if (pref.email_enabled) emailTargets.push(uid);
    if (pref.push_enabled && pref.push_subscription) {
      pushTargets.push(pref.push_subscription as { endpoint: string; keys: Record<string, string> });
    }
  }

  const title = `新しいお知らせ: ${bulletin.title}`;
  const body = bulletin.content.slice(0, 100);

  await Promise.allSettled([
    ...emailTargets.map((uid) => sendEmail(supabase, uid, title, body, bulletin.id)),
    ...pushTargets.map((sub) => sendPushNotification(sub, title, body, bulletin.id)),
  ]);

  await supabase
    .from("bulletins")
    .update({ notification_sent: true })
    .eq("id", bulletin.id);
}

export async function dispatchReminder(
  supabase: SupabaseClient,
  unreadUserIds: string[],
  bulletinTitle: string,
  bulletinId: string
) {
  const title = `リマインド: ${bulletinTitle}`;
  const body = "まだ確認されていないお知らせがあります。";

  const { data: preferences } = await supabase
    .from("notification_preferences")
    .select("*")
    .in("user_id", unreadUserIds);

  const prefMap = new Map(
    (preferences ?? []).map((p) => [p.user_id, p])
  );

  const tasks = unreadUserIds.flatMap((uid) => {
    const pref = prefMap.get(uid);
    const result: Promise<unknown>[] = [];

    if (!pref || pref.email_enabled) {
      result.push(sendEmail(supabase, uid, title, body, bulletinId));
    }
    if (pref?.push_enabled && pref.push_subscription) {
      result.push(
        sendPushNotification(
          pref.push_subscription as { endpoint: string; keys: Record<string, string> },
          title,
          body,
          bulletinId
        )
      );
    }

    return result;
  });

  await Promise.allSettled(tasks);
}
