import type { ClientSession } from "mongoose";
import mongoose from "mongoose";
import { derivePaymentStatus } from "@/lib/payments/status";
import { normalizePaymentStatus, type PaymentStatus } from "@/lib/status";
import { Payment } from "@/models/Payment";

export async function getOrderPaymentStatus(
  orderId: string,
  session?: ClientSession,
): Promise<PaymentStatus> {
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    return "Unpaid";
  }

  let query = Payment.find({ orderId });
  if (session) {
    query = query.session(session);
  }
  const payments = await query.lean();
  if (!payments.length) {
    return "Unpaid";
  }

  const invoiceAmount = payments.reduce(
    (sum, payment) => sum + Number(payment.invoiceAmount ?? 0),
    0,
  );
  const amountReceived = payments.reduce(
    (sum, payment) => sum + Number(payment.amountReceived ?? 0),
    0,
  );
  const hasOverdue = payments.some(
    (payment) => normalizePaymentStatus(payment.status) === "Overdue",
  );

  if (hasOverdue && amountReceived < invoiceAmount) {
    return "Overdue";
  }

  return derivePaymentStatus(invoiceAmount, amountReceived);
}
