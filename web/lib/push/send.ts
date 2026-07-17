import "server-only";
import webpush from "web-push";
import { createServiceClient } from "@/lib/supabase/admin";

export type PushKind = "message" | "share" | "friend" | "group";
export interface PushPayload { title: string; body: string; url: string; tag: string; }

const preferenceColumn: Record<PushKind, string> = {
  message: "messages_enabled", share: "shares_enabled", friend: "friends_enabled", group: "groups_enabled",
};

export async function sendPushToUsers(userIds: string[], kind: PushKind, payload: PushPayload) {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey || userIds.length === 0) return;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@pbox.app", publicKey, privateKey);

  let admin;
  try { admin = createServiceClient(); } catch { return; }
  const column = preferenceColumn[kind];
  const { data } = await admin.from("push_subscriptions").select("id, endpoint, p256dh, auth").in("user_id", [...new Set(userIds)]).eq(column, true);
  await Promise.all((data ?? []).map(async (subscription) => {
    try {
      await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify(payload), { TTL: 60 * 60, urgency: kind === "message" ? "high" : "normal" });
    } catch (error) {
      const status = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : 0;
      if (status === 404 || status === 410) await admin.from("push_subscriptions").delete().eq("id", subscription.id);
    }
  }));
}
