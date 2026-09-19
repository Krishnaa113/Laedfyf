import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { audienceHref } from "@/lib/notifications/hrefs";
import type { SerializeAudience } from "@/lib/serialize";
import type { NotificationType } from "@/lib/status";
import { Notification } from "@/models/Notification";

export type SerializedNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  entityType: string;
  entityId: string | null;
  clientId: string | null;
  href: string;
  readAt: string | null;
  createdAt: string | null;
};

export function serializeNotification(
  doc: Record<string, unknown> | null,
  options: { audience?: SerializeAudience } = {},
): SerializedNotification | null {
  if (!doc) {
    return null;
  }

  const entityType = String(doc.entityType ?? "");
  const entityId = doc.entityId ? String(doc.entityId) : null;
  const audience = options.audience ?? "internal";

  return {
    id: String(doc._id),
    type: doc.type as NotificationType,
    title: String(doc.title ?? ""),
    body: String(doc.body ?? ""),
    entityType,
    entityId,
    clientId: doc.clientId ? String(doc.clientId) : null,
    href: audienceHref(entityType, entityId, audience) || String(doc.href ?? ""),
    readAt: doc.readAt ? new Date(String(doc.readAt)).toISOString() : null,
    createdAt: doc.createdAt ? new Date(String(doc.createdAt)).toISOString() : null,
  };
}

export async function loadNotificationFeed(
  userId: string,
  options: { audience?: SerializeAudience; unreadOnly?: boolean; limit?: number } = {},
) {
  await connectDB();
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return { notifications: [], unreadCount: 0 };
  }
  const filter: Record<string, unknown> = {
    userId: new mongoose.Types.ObjectId(userId),
  };
  if (options.unreadOnly) {
    filter.readAt = null;
  }

  const limit = Math.min(Math.max(options.limit ?? 30, 1), 100);
  const [docs, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).limit(limit).lean(),
    Notification.countDocuments({
      userId: new mongoose.Types.ObjectId(userId),
      readAt: null,
    }),
  ]);

  const serializeOpts = { audience: options.audience ?? "internal" };

  return {
    notifications: docs
      .map((doc) => serializeNotification(doc as Record<string, unknown>, serializeOpts))
      .filter((item): item is SerializedNotification => Boolean(item)),
    unreadCount,
  };
}
