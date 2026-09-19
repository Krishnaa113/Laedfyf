import mongoose, { Schema } from "mongoose";
import { NOTIFICATION_TYPES, type NotificationType } from "@/lib/status";
import { objectIdRef } from "@/lib/schema";

mongoose.set("overwriteModels", true);

export const NOTIFICATION_CHANNELS = ["in-app", "email", "whatsapp"] as const;
export type NotificationChannelName = (typeof NOTIFICATION_CHANNELS)[number];

const NotificationSchema = new Schema(
  {
    userId: objectIdRef("User", { required: true }),
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    body: { type: String, default: "" },
    entityType: { type: String, default: "", trim: true },
    entityId: { type: Schema.Types.ObjectId, default: null },
    clientId: objectIdRef("Client"),
    href: { type: String, default: "", trim: true },
    channel: {
      type: String,
      enum: NOTIFICATION_CHANNELS,
      default: "in-app",
    },
    dedupeKey: { type: String, default: null, trim: true },
    readAt: { type: Date, default: null },
  },
  { timestamps: true, strict: true },
);

NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });
NotificationSchema.index(
  { userId: 1, dedupeKey: 1 },
  { unique: true, sparse: true },
);

export type NotificationDocument =
  mongoose.InferSchemaType<typeof NotificationSchema> & {
    _id: mongoose.Types.ObjectId;
    type: NotificationType;
    channel: NotificationChannelName;
  };

export const Notification = mongoose.model<NotificationDocument>(
  "Notification",
  NotificationSchema,
);
