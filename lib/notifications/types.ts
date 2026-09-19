import type { NotificationType } from "@/lib/status";

export type NotificationChannelName = "in-app" | "email" | "whatsapp";

export type NotificationPayload = {
  type: NotificationType;
  title: string;
  body: string;
  entityType: string;
  entityId?: string | null;
  clientId?: string | null;
  href?: string;
  userIds: string[];
  excludeUserId?: string | null;
  dedupeKey?: string | null;
  metadata?: Record<string, unknown>;
};

export type NotificationChannel = {
  name: NotificationChannelName;
  send: (payload: NotificationPayload) => Promise<void>;
};
