import mongoose, { Schema } from "mongoose";
import { PAYMENT_STATUSES, type PaymentStatus } from "@/lib/status";
import { objectIdRef } from "@/lib/schema";

mongoose.set("overwriteModels", true);

const PaymentSchema = new Schema(
  {
    clientId: objectIdRef("Client", { required: true }),
    orderId: objectIdRef("Order"),
    invoiceAmount: { type: Number, required: true, min: 0 },
    amountReceived: { type: Number, default: 0, min: 0 },
    paymentDate: { type: Date, default: null },
    method: { type: String, default: "", trim: true },
    transactionRef: { type: String, default: "", trim: true },
    notes: { type: String, default: "" },
    status: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: "Unpaid",
      index: true,
    },
  },
  {
    timestamps: true,
    strict: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

PaymentSchema.virtual("pendingBalance").get(function pendingBalance() {
  return Number(this.invoiceAmount ?? 0) - Number(this.amountReceived ?? 0);
});

PaymentSchema.index({ clientId: 1, status: 1 });

export type PaymentDocument = mongoose.InferSchemaType<typeof PaymentSchema> & {
  _id: mongoose.Types.ObjectId;
  status: PaymentStatus;
  pendingBalance: number;
};

export const Payment = mongoose.model<PaymentDocument>("Payment", PaymentSchema);
