import Link from "next/link";
import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { loadPaymentHub } from "@/lib/payments/hub";
import { pageCanWrite, requirePageAccess } from "@/lib/page-auth";
import { PaymentStatusBadge } from "@/components/status-badge";

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function PaymentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const auth = await requirePageAccess("payments", "read");
  const canWrite = pageCanWrite(auth, "payments");
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
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/payments" className="text-sm text-white/50 hover:text-brand">
            Back to payments
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">
            {payment.companyName || payment.clientName || "Invoice"}
          </h1>
          <p className="mt-1 text-white/70">{payment.packageName || "No linked package"}</p>
        </div>
        <div className="flex items-center gap-3">
          <PaymentStatusBadge status={payment.status} />
          {canWrite ? (
            <Link
              href={`/payments/${payment.id}/edit`}
              className="rounded-md border border-white/15 px-4 py-2 text-sm hover:border-brand hover:text-brand"
            >
              Edit
            </Link>
          ) : null}
        </div>
      </div>
      <section className="grid gap-4 rounded-lg border border-white/10 p-6 md:grid-cols-3">
        <Info label="Invoice amount" value={formatMoney(payment.invoiceAmount)} />
        <Info label="Amount received" value={formatMoney(payment.amountReceived)} />
        <Info label="Pending balance" value={formatMoney(payment.pendingBalance)} />
        <Info label="Payment date" value={payment.paymentDate?.slice(0, 10) || "—"} />
        <Info label="Method" value={payment.method || "—"} />
        <Info label="Transaction ref" value={payment.transactionRef || "—"} />
      </section>
      {payment.notes ? (
        <section className="rounded-lg border border-white/10 p-6">
          <h2 className="text-lg font-medium">Notes</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm text-white/80">{payment.notes}</p>
        </section>
      ) : null}
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-white/40">{label}</p>
      <p className="mt-1 text-sm">{value}</p>
    </div>
  );
}
