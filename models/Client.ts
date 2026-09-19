import mongoose, { Schema } from "mongoose";
import {
  CLIENT_STATUSES,
  normalizeClientStatus,
  type ClientStatus,
} from "@/lib/status";
import { objectIdRef } from "@/lib/schema";

const CLIENT_STATUS_ENUM = Array.from(
  new Set([
    ...CLIENT_STATUSES,
    "lead",
    "new",
    "onboarding",
    "active",
    "on_hold",
    "On Hold",
    "completed",
    "inactive",
  ]),
);

mongoose.set("overwriteModels", true);

const ClientSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    companyName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, default: "", trim: true },
    whatsapp: { type: String, default: "", trim: true },
    brandName: { type: String, default: "", trim: true },
    industry: { type: String, default: "", trim: true },
    gstTaxId: { type: String, default: "", trim: true },
    assignedEmployeeId: objectIdRef("Employee"),
    source: { type: String, default: "", trim: true },
    status: {
      type: String,
      enum: CLIENT_STATUS_ENUM,
      default: "Lead",
      set: normalizeClientStatus,
      index: true,
    },
    notes: { type: String, default: "" },
    passwordHash: { type: String, default: null, select: false },
    passwordCipher: { type: String, select: false },
    inviteToken: { type: String, select: false },
    inviteTokenExpiry: { type: Date },
    passwordSet: { type: Boolean, default: false, index: true },
  },
  { timestamps: true, strict: true },
);

ClientSchema.index({ companyName: 1 });
ClientSchema.index({ email: 1 });
ClientSchema.index(
  { inviteToken: 1 },
  {
    unique: true,
    // Sparse unique still indexes `null`, so a second spent invite collides.
    partialFilterExpression: { inviteToken: { $type: "string" } },
  },
);

export type ClientDocument = mongoose.InferSchemaType<typeof ClientSchema> & {
  _id: mongoose.Types.ObjectId;
  status: ClientStatus;
  passwordHash: string | null;
  passwordCipher: string | null;
  inviteToken: string | null;
  inviteTokenExpiry: Date | null;
  passwordSet: boolean;
};

export const Client = mongoose.model<ClientDocument>("Client", ClientSchema);
