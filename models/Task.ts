import mongoose, { Schema } from "mongoose";
import {
  TASK_PRIORITIES,
  TASK_RELATED_TYPES,
  TASK_STATUSES,
  normalizeTaskPriority,
  normalizeTaskStatus,
  type TaskPriority,
  type TaskRelatedType,
  type TaskStatus,
} from "@/lib/status";
import { objectIdRef } from "@/lib/schema";

mongoose.set("overwriteModels", true);

const RelatedToSchema = new Schema(
  {
    type: {
      type: String,
      enum: [...TASK_RELATED_TYPES, null],
      default: null,
    },
    id: {
      type: Schema.Types.ObjectId,
      refPath: "relatedTo.type",
      default: null,
    },
  },
  { _id: false },
);

const TaskSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    assigneeId: objectIdRef("User"),
    createdById: objectIdRef("User"),
    clientId: objectIdRef("Client"),
    relatedTo: {
      type: RelatedToSchema,
      default: () => ({ type: null, id: null }),
    },
    priority: {
      type: String,
      enum: TASK_PRIORITIES,
      default: "Medium",
      set: normalizeTaskPriority,
      index: true,
    },
    status: {
      type: String,
      enum: TASK_STATUSES,
      default: "To Do",
      set: normalizeTaskStatus,
      index: true,
    },
    deadline: { type: Date, default: null, index: true },
    attachments: { type: [String], default: [] },
  },
  { timestamps: true, strict: true },
);

TaskSchema.index({ assigneeId: 1, status: 1, deadline: 1 });
TaskSchema.index({ "relatedTo.type": 1, "relatedTo.id": 1 });

export type TaskDocument = mongoose.InferSchemaType<typeof TaskSchema> & {
  _id: mongoose.Types.ObjectId;
  priority: TaskPriority;
  status: TaskStatus;
  relatedTo: {
    type: TaskRelatedType | null;
    id: mongoose.Types.ObjectId | null;
  };
};

export const Task = mongoose.model<TaskDocument>("Task", TaskSchema);
