import Link from "next/link";
import { loadPaymentList } from "@/lib/payments/hub";
import { pageCanWrite, requirePageAccess } from "@/lib/page-auth";
import { PAYMENT_STATUSES, PAYMENT_STATUS_LABELS } from "@/lib/status";
import { PaymentStatusBadge } from "@/components/status-badge";

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; clientId?: string }>;
}) {
  const auth = await requirePageAccess("payments", "read");
  const canWrite = pageCanWrite(auth, "payments");
  const params = await searchParams;
  const payments = await loadPaymentList(auth, {
    status: params.status || undefined,
    clientId: params.clientId || undefined,
  });

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Payments</h1>
          <p className="mt-1 text-sm text-white/60">
            Invoices, receipts, and pending balances.
          </p>
        </div>
        {canWrite ? (
          <Link
            href="/payments/new"
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-charcoal"
          >
            New invoice
          </Link>
        ) : null}
      </div>
      <form className="flex flex-wrap items-end gap-3" action="/payments">
        <label className="flex w-56 flex-col gap-1.5 text-sm">
          <span className="text-white/50">Status</span>
          <select
            name="status"
            defaultValue={params.status ?? ""}
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
          >
            <option value="">All statuses</option>
            {PAYMENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {PAYMENT_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-md border border-white/15 px-4 py-2 text-sm hover:border-brand hover:text-brand"
        >
          Filter
        </button>
      </form>
      <section className="overflow-hidden rounded-lg border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-white/60">
            <tr>
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium">Package</th>
              <th className="px-4 py-3 font-medium">Invoice</th>
              <th className="px-4 py-3 font-medium">Received</th>
              <th className="px-4 py-3 font-medium">Pending</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-white/50">
                  No invoices yet.
                </td>
              </tr>
            ) : (
              payments.map((payment) => (
                <tr key={payment.id} className="border-t border-white/10">
                  <td className="px-4 py-3">
                    <Link href={`/payments/${payment.id}`} className="hover:text-brand">
                      {payment.companyName || payment.clientName || "Invoice"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-white/70">{payment.packageName || "—"}</td>
                  <td className="px-4 py-3 text-white/70">
                    {formatMoney(payment.invoiceAmount)}
                  </td>
                  <td className="px-4 py-3 text-white/70">
                    {formatMoney(payment.amountReceived)}
                  </td>
                  <td className="px-4 py-3 text-white/70">
                    {formatMoney(payment.pendingBalance)}
                  </td>
                  <td className="px-4 py-3">
                    <PaymentStatusBadge status={payment.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
