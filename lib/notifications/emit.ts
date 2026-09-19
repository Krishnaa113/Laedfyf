import { getNotificationChannels } from "./channels";
import type { NotificationPayload } from "./types";

export async function emitNotification(payload: NotificationPayload) {
  if (!payload.userIds.length) {
    return;
  }

  const channels = getNotificationChannels();
  const results = await Promise.allSettled(
    channels.map((channel) => channel.send(payload)),
  );

  for (const result of results) {
    if (result.status === "rejected") {
      // A failed channel must not block in-app delivery or the originating write.
    }
  }
}
