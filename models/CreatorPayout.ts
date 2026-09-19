import mongoose, { Schema } from "mongoose";
import { PAYOUT_STATUSES, type PayoutStatus } from "@/lib/status";
import { objectIdRef } from "@/lib/schema";
import { PAYOUT_POPULATE } from "@/lib/populate";

mongoose.set("overwriteModels", true);

const CreatorPayoutSchema = new Schema(
  {
    creatorId: objectIdRef("Creator", { required: true }),
    orderId: objectIdRef("Order"),
    videoId: objectIdRef("Video", { required: true }),
    videoCount: { type: Number, default: 1, min: 1 },
    contractedRate: { type: Number, required: true, min: 0 },
    totalPayout: { type: Number, required: true, min: 0 },
    paymentDate: { type: Date, default: null },
    reference: { type: String, default: "", trim: true },
    status: {
      type: String,
      enum: PAYOUT_STATUSES,
      default: "Pending",
      index: true,
    },
  },
  { timestamps: true, strict: true },
);

CreatorPayoutSchema.index({ creatorId: 1, videoId: 1 }, { unique: true });

CreatorPayoutSchema.statics.findPopulated = function findPopulated(filter = {}) {
  return this.find(filter).populate(PAYOUT_POPULATE);
};

export type CreatorPayoutDocument =
  mongoose.InferSchemaType<typeof CreatorPayoutSchema> & {
    _id: mongoose.Types.ObjectId;
    status: PayoutStatus;
  };

export const CreatorPayout = mongoose.model<CreatorPayoutDocument>(
  "CreatorPayout",
  CreatorPayoutSchema,
);
