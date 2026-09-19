import { loadPaymentList } from "@/lib/payments/hub";
import { requirePortalAccess } from "@/lib/page-auth";
import { formatPortalDate, formatPortalMoney } from "@/lib/portal/format";
import { PaymentStatusBadge } from "@/components/status-badge";

export default async function PortalInvoicesPage() {
  const auth = await requirePortalAccess("payments", "read");
  const invoices = await loadPaymentList(auth);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold">Invoices</h1>
        <p className="mt-1 text-sm text-white/60">
          Invoice amounts and payment status for your account.
        </p>
      </div>
      <section className="overflow-hidden rounded-lg border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-white/60">
            <tr>
              <th className="px-4 py-3 font-medium">Package</th>
              <th className="px-4 py-3 font-medium">Invoice</th>
              <th className="px-4 py-3 font-medium">Received</th>
              <th className="px-4 py-3 font-medium">Pending</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-white/50">
                  No invoices yet.
                </td>
              </tr>
            ) : (
              invoices.map((invoice) => (
                <tr key={invoice.id} className="border-t border-white/10">
                  <td className="px-4 py-3">{invoice.packageName || "Invoice"}</td>
                  <td className="px-4 py-3 text-white/70">
                    {formatPortalMoney(invoice.invoiceAmount)}
                  </td>
                  <td className="px-4 py-3 text-white/70">
                    {formatPortalMoney(invoice.amountReceived)}
                  </td>
                  <td className="px-4 py-3 text-white/70">
                    {formatPortalMoney(invoice.pendingBalance)}
                  </td>
                  <td className="px-4 py-3 text-white/70">
                    {formatPortalDate(invoice.paymentDate || invoice.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <PaymentStatusBadge status={invoice.status} />
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
