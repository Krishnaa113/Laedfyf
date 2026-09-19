import mongoose from "mongoose";
import { isDuplicateKeyError } from "@/lib/mongo-errors";
import { connectDB } from "@/lib/db";
import { Notification } from "@/models/Notification";
import type { NotificationChannel, NotificationPayload } from "./types";

function uniqueUserIds(payload: NotificationPayload) {
  const exclude = payload.excludeUserId ? String(payload.excludeUserId) : null;
  return [...new Set(payload.userIds.map(String).filter(Boolean))].filter(
    (id) => mongoose.Types.ObjectId.isValid(id) && id !== exclude,
  );
}

export const inAppChannel: NotificationChannel = {
  name: "in-app",
  async send(payload) {
    const userIds = uniqueUserIds(payload);
    if (userIds.length === 0) {
      return;
    }

    await connectDB();

    const docs = userIds.map((userId) => ({
      userId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      entityType: payload.entityType,
      entityId:
        payload.entityId && mongoose.Types.ObjectId.isValid(payload.entityId)
          ? payload.entityId
          : null,
      clientId:
        payload.clientId && mongoose.Types.ObjectId.isValid(payload.clientId)
          ? payload.clientId
          : null,
      href: payload.href ?? "",
      channel: "in-app" as const,
      dedupeKey: payload.dedupeKey
        ? `${userId}:${payload.dedupeKey}`
        : null,
    }));

    try {
      await Notification.insertMany(docs, { ordered: false });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        return;
      }
      if (
        error &&
        typeof error === "object" &&
        "writeErrors" in error &&
        Array.isArray((error as { writeErrors?: unknown[] }).writeErrors)
      ) {
        return;
      }
      throw error;
    }
  },
};

export const emailChannel: NotificationChannel = {
  name: "email",
  async send(_payload) {
    // Plug in SMTP/provider here. Call sites stay on trigger functions.
  },
};

export const whatsappChannel: NotificationChannel = {
  name: "whatsapp",
  async send(_payload) {
    // Plug in WhatsApp Business API here. Call sites stay on trigger functions.
  },
};

const channels: NotificationChannel[] = [inAppChannel];

function envEnabled(name: string) {
  const raw = process.env[name];
  return raw === "true" || raw === "1";
}

if (envEnabled("NOTIFY_EMAIL")) {
  channels.push(emailChannel);
}
if (envEnabled("NOTIFY_WHATSAPP")) {
  channels.push(whatsappChannel);
}

export function getNotificationChannels() {
  return [...channels];
}

export function registerNotificationChannel(channel: NotificationChannel) {
  if (!channels.some((item) => item.name === channel.name)) {
    channels.push(channel);
  }
}

export function resetNotificationChannels(next: NotificationChannel[] = [inAppChannel]) {
  channels.splice(0, channels.length, ...next);
}
