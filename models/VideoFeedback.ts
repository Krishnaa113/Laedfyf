import mongoose, { Schema } from "mongoose";
import { objectIdRef } from "@/lib/schema";

const VideoFeedbackSchema = new Schema(
  {
    videoId: objectIdRef("Video", { required: true }),
    authorId: objectIdRef("User"),
    timecode: { type: String, default: "", trim: true },
    comment: { type: String, required: true, trim: true },
    decision: {
      type: String,
      enum: ["Approve", "Request Revision"],
      default: "Request Revision",
    },
  },
  { timestamps: true, strict: true },
);

VideoFeedbackSchema.index({ videoId: 1, createdAt: -1 });

export type VideoFeedbackDocument =
  mongoose.InferSchemaType<typeof VideoFeedbackSchema> & {
    _id: mongoose.Types.ObjectId;
  };

export const VideoFeedback =
  mongoose.models.VideoFeedback ??
  mongoose.model<VideoFeedbackDocument>("VideoFeedback", VideoFeedbackSchema);
