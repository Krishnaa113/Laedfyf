import mongoose, { Schema } from "mongoose";
import {
  SCRIPT_STATUSES,
  normalizeScriptStatus,
  type ScriptStatus,
} from "@/lib/status";
import { objectIdRef } from "@/lib/schema";

const ScriptCommentSchema = new Schema(
  {
    authorId: objectIdRef("User", { index: false }),
    authorName: { type: String, default: "", trim: true },
    authorRole: { type: String, default: "", trim: true },
    body: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

const SCRIPT_STATUS_ENUM = Array.from(
  new Set([
    ...SCRIPT_STATUSES,
    "draft",
    "assigned",
    "in_review",
    "sent_to_client",
    "revision_required",
    "approved",
    "ready_for_shoot",
  ]),
);

const ScriptSchema = new Schema(
  {
    clientId: objectIdRef("Client", { required: true }),
    orderId: objectIdRef("Order"),
    videoNumber: { type: Number, default: 1, min: 1 },
    writerId: objectIdRef("Employee"),
    creatorId: objectIdRef("Creator"),
    language: { type: String, default: "", trim: true },
    scriptText: { type: String, default: "" },
    referenceLinks: { type: [String], default: [] },
    deadline: { type: Date, default: null },
    revisionCount: { type: Number, default: 0, min: 0 },
    comments: {
      type: [ScriptCommentSchema],
      default: [],
      set(value: unknown) {
        if (typeof value === "string") {
          const body = value.trim();
          return body
            ? [{ body, authorName: "Note", authorRole: "" }]
            : [];
        }
        return value;
      },
    },
    status: {
      type: String,
      enum: SCRIPT_STATUS_ENUM,
      default: "Draft",
      set: normalizeScriptStatus,
      index: true,
    },
  },
  { timestamps: true, strict: true },
);

ScriptSchema.index({ clientId: 1, status: 1 });
ScriptSchema.index({ orderId: 1, videoNumber: 1 });

export type ScriptDocument = mongoose.InferSchemaType<typeof ScriptSchema> & {
  _id: mongoose.Types.ObjectId;
  status: ScriptStatus;
};

export const Script =
  mongoose.models.Script ??
  mongoose.model<ScriptDocument>("Script", ScriptSchema);
