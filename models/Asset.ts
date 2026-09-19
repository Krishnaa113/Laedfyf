import mongoose, { Schema } from "mongoose";
import { ASSET_KINDS, type AssetKind } from "@/lib/status";
import { objectIdRef } from "@/lib/schema";

const AssetSchema = new Schema(
  {
    clientId: objectIdRef("Client", { required: true }),
    uploadedById: objectIdRef("User"),
    name: { type: String, required: true, trim: true },
    kind: {
      type: String,
      enum: ASSET_KINDS,
      default: "Other",
    },
    url: { type: String, required: true, trim: true },
  },
  { timestamps: true, strict: true },
);

AssetSchema.index({ clientId: 1, kind: 1 });

export type AssetDocument = mongoose.InferSchemaType<typeof AssetSchema> & {
  _id: mongoose.Types.ObjectId;
  kind: AssetKind;
};

export const Asset =
  mongoose.models.Asset ?? mongoose.model<AssetDocument>("Asset", AssetSchema);
