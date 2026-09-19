import mongoose, { Schema } from "mongoose";
import {
  ORDER_STATUSES,
  normalizeOrderStatus,
  type OrderStatus,
} from "@/lib/status";
import { objectIdRef, objectIdRefList } from "@/lib/schema";

const ORDER_STATUS_ENUM = Array.from(
  new Set([
    ...ORDER_STATUSES,
    "new",
    "onboarding",
    "in_production",
    "partially_delivered",
    "completed",
    "on_hold",
    "cancelled",
  ]),
);

const OrderSchema = new Schema(
  {
    clientId: objectIdRef("Client", { required: true }),
    packageName: { type: String, required: true, trim: true },
    contractedVideoCount: { type: Number, required: true, min: 1 },
    pricing: { type: Number, default: 0, min: 0 },
    gstTax: { type: Number, default: 0, min: 0 },
    totalInvoiceAmount: { type: Number, default: 0, min: 0 },
    amountReceived: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ORDER_STATUS_ENUM,
      default: "New",
      set: normalizeOrderStatus,
      index: true,
    },
    assignedEmployeeIds: objectIdRefList("Employee"),
    completedVideos: { type: Number, default: 0, min: 0 },
    remainingQuota: { type: Number, default: 0, min: 0 },
    startDate: { type: Date, default: null },
    dueDate: { type: Date, default: null },
  },
  {
    timestamps: true,
    strict: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

OrderSchema.virtual("outstandingBalance").get(function outstandingBalance() {
  return Number(this.totalInvoiceAmount ?? 0) - Number(this.amountReceived ?? 0);
});

OrderSchema.index({ clientId: 1, status: 1 });

export type OrderDocument = mongoose.InferSchemaType<typeof OrderSchema> & {
  _id: mongoose.Types.ObjectId;
  status: OrderStatus;
  outstandingBalance: number;
};

export const Order =
  mongoose.models.Order ?? mongoose.model<OrderDocument>("Order", OrderSchema);
