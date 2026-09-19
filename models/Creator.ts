import mongoose, { Schema } from "mongoose";
import {
  CREATOR_AVAILABILITY_STATUSES,
  normalizeCreatorAvailability,
  type CreatorAvailabilityStatus,
} from "@/lib/status";
import { objectIdRef } from "@/lib/schema";

mongoose.set("overwriteModels", true);

const AVAILABILITY_ENUM = Array.from(
  new Set([
    ...CREATOR_AVAILABILITY_STATUSES,
    "available",
    "booked",
    "unavailable",
    "on_hold",
  ]),
);

const CreatorSchema = new Schema(
  {
    userId: objectIdRef("User"),
    name: { type: String, required: true, trim: true },
    photoUrl: { type: String, default: "", trim: true },
    gender: { type: String, default: "", trim: true },
    ageGroup: { type: String, default: "", trim: true },
    languages: { type: [String], default: [] },
    location: { type: String, default: "", trim: true },
    niches: { type: [String], default: [] },
    demographics: { type: String, default: "" },
    email: { type: String, default: "", lowercase: true, trim: true },
    phone: { type: String, default: "", trim: true },
    rate: { type: Number, default: 0, min: 0 },
    bankAccountName: { type: String, default: "", trim: true },
    bankAccountNumber: { type: String, default: "", trim: true },
    upiId: { type: String, default: "", trim: true },
    portfolioLinks: { type: [String], default: [] },
    availability: {
      type: String,
      enum: AVAILABILITY_ENUM,
      default: "Available",
      set: normalizeCreatorAvailability,
      index: true,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, strict: true },
);

CreatorSchema.index({ name: 1 });
CreatorSchema.index({ location: 1, availability: 1 });

export type CreatorDocument = mongoose.InferSchemaType<typeof CreatorSchema> & {
  _id: mongoose.Types.ObjectId;
  availability: CreatorAvailabilityStatus;
};

export const Creator = mongoose.model<CreatorDocument>("Creator", CreatorSchema);
