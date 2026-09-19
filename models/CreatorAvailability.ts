import mongoose, { Schema } from "mongoose";
import {
  CREATOR_AVAILABILITY_STATUSES,
  type CreatorAvailabilityStatus,
} from "@/lib/status";
import { objectIdRef } from "@/lib/schema";

const CreatorAvailabilitySchema = new Schema(
  {
    creatorId: objectIdRef("Creator", { required: true }),
    shootId: objectIdRef("Shoot"),
    startsAt: { type: Date, required: true, index: true },
    endsAt: { type: Date, default: null },
    status: {
      type: String,
      enum: CREATOR_AVAILABILITY_STATUSES,
      default: "Available",
      index: true,
    },
    notes: { type: String, default: "" },
  },
  { timestamps: true, strict: true },
);

CreatorAvailabilitySchema.index({ creatorId: 1, startsAt: 1 });

export type CreatorAvailabilityDocument =
  mongoose.InferSchemaType<typeof CreatorAvailabilitySchema> & {
    _id: mongoose.Types.ObjectId;
    status: CreatorAvailabilityStatus;
  };

export const CreatorAvailability =
  mongoose.models.CreatorAvailability ??
  mongoose.model<CreatorAvailabilityDocument>(
    "CreatorAvailability",
    CreatorAvailabilitySchema,
  );
