import Link from "next/link";
import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { loadPaymentHub } from "@/lib/payments/hub";
import { requirePageAccess } from "@/lib/page-auth";
import { PaymentForm } from "@/components/payments/payment-form";

export default async function EditPaymentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const auth = await requirePageAccess("payments", "write");
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    notFound();
  }
  const result = await loadPaymentHub(auth, id);
  if (!result.ok) {
    notFound();
  }
  const { payment } = result.hub;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10">
      <div>
        <Link
          href={`/payments/${payment.id}`}
          className="text-sm text-white/50 hover:text-brand"
        >
          Back to invoice
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Edit invoice</h1>
      </div>
      <PaymentForm
        paymentId={payment.id}
        initialValues={{
          clientId: payment.clientId ?? "",
          orderId: payment.orderId,
          invoiceAmount: payment.invoiceAmount,
          amountReceived: payment.amountReceived,
          paymentDate: payment.paymentDate ?? "",
          method: payment.method,
          transactionRef: payment.transactionRef,
          notes: payment.notes,
          status: payment.status,
        }}
      />
    </main>
  );
}
