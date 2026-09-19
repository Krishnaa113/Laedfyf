import mongoose, { Schema } from "mongoose";
import { TICKET_STATUSES, type TicketStatus } from "@/lib/status";
import { objectIdRef } from "@/lib/schema";

mongoose.set("overwriteModels", true);

const SupportTicketSchema = new Schema(
  {
    clientId: objectIdRef("Client", { required: true }),
    orderId: objectIdRef("Order"),
    openedById: objectIdRef("User"),
    assignedEmployeeId: objectIdRef("Employee"),
    subject: { type: String, required: true, trim: true },
    body: { type: String, default: "" },
    status: {
      type: String,
      enum: TICKET_STATUSES,
      default: "Open",
      index: true,
    },
  },
  { timestamps: true, strict: true },
);

SupportTicketSchema.index({ clientId: 1, status: 1 });

export type SupportTicketDocument =
  mongoose.InferSchemaType<typeof SupportTicketSchema> & {
    _id: mongoose.Types.ObjectId;
    status: TicketStatus;
  };

export const SupportTicket = mongoose.model<SupportTicketDocument>(
  "SupportTicket",
  SupportTicketSchema,
);
