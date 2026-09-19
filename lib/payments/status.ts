import type { PaymentStatus } from "@/lib/status";

export function derivePaymentStatus(
  invoiceAmount: number,
  amountReceived: number,
  explicit?: PaymentStatus,
): PaymentStatus {
  if (amountReceived >= invoiceAmount && invoiceAmount > 0) {
    return "Paid";
  }
  if (amountReceived > 0 && amountReceived < invoiceAmount) {
    return explicit === "Overdue" ? "Overdue" : "Partially Paid";
  }
  if (explicit === "Overdue") {
    return "Overdue";
  }
  if (explicit === "Paid" && invoiceAmount <= 0) {
    return "Paid";
  }
  return explicit === "Partially Paid" ? "Partially Paid" : "Unpaid";
}
