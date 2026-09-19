import mongoose from "mongoose";
import { ActivityLog } from "@/models/ActivityLog";

export async function logActivity(input: {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId: string | mongoose.Types.ObjectId;
  metadata?: Record<string, unknown>;
}) {
  try {
    const entityId =
      input.entityId instanceof mongoose.Types.ObjectId
        ? input.entityId
        : new mongoose.Types.ObjectId(String(input.entityId));

    const actorId =
      input.actorId && mongoose.Types.ObjectId.isValid(input.actorId)
        ? new mongoose.Types.ObjectId(input.actorId)
        : null;

    await ActivityLog.create({
      actorId,
      action: input.action,
      entityType: input.entityType,
      entityId,
      metadata: input.metadata ?? {},
    });
  } catch {
    // Activity logging should never fail a client write.
  }
}
