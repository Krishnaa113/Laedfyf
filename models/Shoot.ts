import mongoose, { Schema } from "mongoose";
import {
  SHOOT_STATUSES,
  normalizeShootStatus,
  type ShootStatus,
} from "@/lib/status";
import { objectIdRef, objectIdRefList } from "@/lib/schema";

mongoose.set("overwriteModels", true);

const ShootSchema = new Schema(
  {
    clientId: objectIdRef("Client", { required: true }),
    orderId: objectIdRef("Order"),
    creatorId: objectIdRef("Creator"),
    cameramanId: objectIdRef("Employee"),
    shootManagerId: objectIdRef("Employee"),
    assistantId: objectIdRef("Employee"),
    approvedScriptIds: objectIdRefList("Script"),
    location: { type: String, default: "", trim: true },
    scheduledAt: { type: Date, default: null, index: true },
    endsAt: { type: Date, default: null },
    status: {
      type: String,
      enum: SHOOT_STATUSES,
      default: "Scheduled",
      set: normalizeShootStatus,
      index: true,
    },
    notes: { type: String, default: "" },
    checklist: {
      scriptApproved: { type: Boolean, default: false },
      creatorConfirmed: { type: Boolean, default: false },
      locationPermission: { type: Boolean, default: false },
      clientProductReceived: { type: Boolean, default: false },
      teamBriefed: { type: Boolean, default: false },
    },
    footageUploaded: { type: Boolean, default: false },
    rawIntegrityChecked: { type: Boolean, default: false },
    reshootRequired: { type: Boolean, default: false },
  },
  { timestamps: true, strict: true },
);

ShootSchema.index({ creatorId: 1, scheduledAt: 1 });

export type ShootDocument = mongoose.InferSchemaType<typeof ShootSchema> & {
  _id: mongoose.Types.ObjectId;
  status: ShootStatus;
};

export const Shoot = mongoose.model<ShootDocument>("Shoot", ShootSchema);
