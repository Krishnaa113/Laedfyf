import mongoose, { Schema } from "mongoose";
import { objectIdRef } from "@/lib/schema";

const ActivityLogSchema = new Schema(
  {
    actorId: objectIdRef("User"),
    action: { type: String, required: true, trim: true, index: true },
    entityType: { type: String, required: true, trim: true, index: true },
    entityId: { type: Schema.Types.ObjectId, required: true, index: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, strict: true },
);

ActivityLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

export type ActivityLogDocument =
  mongoose.InferSchemaType<typeof ActivityLogSchema> & {
    _id: mongoose.Types.ObjectId;
  };

export const ActivityLog =
  mongoose.models.ActivityLog ??
  mongoose.model<ActivityLogDocument>("ActivityLog", ActivityLogSchema);
