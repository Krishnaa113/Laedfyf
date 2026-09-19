import { loadExecutiveAnalytics } from "@/lib/analytics/hub";
import { requirePageAccess } from "@/lib/page-auth";
import { isUnpaidDeliveryBlocked } from "@/lib/finance/config";

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function AnalyticsPage() {
  await requirePageAccess("analytics", "read");
  const analytics = await loadExecutiveAnalytics();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold">Executive analytics</h1>
        <p className="mt-1 text-sm text-white/60">
          Live Mongo aggregations. Unpaid-order delivery block is{" "}
          {isUnpaidDeliveryBlocked() ? "on" : "off"}.
        </p>
      </div>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Revenue" value={formatMoney(analytics.revenue)} />
        <Stat label="Expenses" value={formatMoney(analytics.expenses)} />
        <Stat label="Creator payouts" value={formatMoney(analytics.creatorPayouts)} />
        <Stat label="Net profit" value={formatMoney(analytics.netProfit)} />
        <Stat label="Total receivables" value={formatMoney(analytics.totalReceivables)} />
        <Stat label="Pending invoices" value={String(analytics.pendingInvoices)} />
      </section>
      <section className="overflow-hidden rounded-lg border border-white/10">
        <div className="border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-medium">Monthly revenue / expenses</h2>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-white/60">
            <tr>
              <th className="px-4 py-3 font-medium">Month</th>
              <th className="px-4 py-3 font-medium">Revenue</th>
              <th className="px-4 py-3 font-medium">Expenses</th>
            </tr>
          </thead>
          <tbody>
            {analytics.monthly.map((row) => (
              <tr key={row.month} className="border-t border-white/10">
                <td className="px-4 py-3">{row.month}</td>
                <td className="px-4 py-3 text-white/70">{formatMoney(row.revenue)}</td>
                <td className="px-4 py-3 text-white/70">{formatMoney(row.expenses)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 p-4">
      <p className="text-xs uppercase tracking-wide text-white/40">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}
