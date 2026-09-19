import mongoose, { Schema } from "mongoose";
import {
  VIDEO_STATUSES,
  normalizeVideoStatus,
  type VideoStatus,
} from "@/lib/status";
import { objectIdRef } from "@/lib/schema";

mongoose.set("overwriteModels", true);

const VideoFeedbackLogSchema = new Schema(
  {
    authorId: objectIdRef("User", { index: false }),
    authorName: { type: String, default: "", trim: true },
    authorRole: { type: String, default: "", trim: true },
    body: { type: String, required: true, trim: true },
    timecode: { type: String, default: "", trim: true },
    decision: {
      type: String,
      enum: ["Approve", "Request Revision", "Comment"],
      default: "Comment",
    },
  },
  { timestamps: true },
);

const VideoSchema = new Schema(
  {
    clientId: objectIdRef("Client", { required: true }),
    orderId: objectIdRef("Order", { required: true }),
    scriptId: objectIdRef("Script"),
    creatorId: objectIdRef("Creator"),
    shootId: objectIdRef("Shoot"),
    editorId: objectIdRef("Employee"),
    deadline: { type: Date, default: null, index: true },
    fileLink: { type: String, default: "", trim: true },
    thumbnailUrl: { type: String, default: "", trim: true },
    finalDeliveryLink: { type: String, default: "", trim: true },
    revisionCount: { type: Number, default: 0, min: 0 },
    revisionPriority: { type: Boolean, default: false, index: true },
    revisionRequestedAt: { type: Date, default: null },
    feedbackLog: { type: [VideoFeedbackLogSchema], default: [] },
    status: {
      type: String,
      enum: VIDEO_STATUSES,
      default: "Script Approved",
      set: normalizeVideoStatus,
      index: true,
    },
  },
  { timestamps: true, strict: true },
);

VideoSchema.index({ clientId: 1, status: 1 });
VideoSchema.index({ editorId: 1, deadline: 1 });
VideoSchema.index({ orderId: 1, status: 1 });

export type VideoDocument = mongoose.InferSchemaType<typeof VideoSchema> & {
  _id: mongoose.Types.ObjectId;
  status: VideoStatus;
};

export const Video = mongoose.model<VideoDocument>("Video", VideoSchema);
