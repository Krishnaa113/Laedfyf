import Link from "next/link";
import { loadOrderList } from "@/lib/orders/hub";
import { pageCanWrite, requirePageAccess } from "@/lib/page-auth";
import { ORDER_STATUSES, ORDER_STATUS_LABELS } from "@/lib/status";
import { OrderStatusBadge } from "@/components/status-badge";

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; clientId?: string }>;
}) {
  const auth = await requirePageAccess("orders", "read");
  const canWrite = pageCanWrite(auth, "orders");
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const status = params.status ?? "";
  const clientId = params.clientId ?? "";

  const orders = await loadOrderList(auth, {
    q: q || undefined,
    status: status || undefined,
    clientId: clientId || undefined,
  });

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Packages / Orders</h1>
          <p className="mt-1 text-sm text-white/60">
            {orders.length} record{orders.length === 1 ? "" : "s"} · counters live from videos
          </p>
        </div>
        {canWrite ? (
          <Link
            href={clientId ? `/orders/new?clientId=${clientId}` : "/orders/new"}
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-charcoal"
          >
            Add package
          </Link>
        ) : null}
      </div>

      <form className="flex flex-wrap items-end gap-3" action="/orders">
        {clientId ? <input type="hidden" name="clientId" value={clientId} /> : null}
        <label className="flex min-w-64 flex-1 flex-col gap-1.5 text-sm">
          <span className="text-white/50">Search</span>
          <input
            name="q"
            defaultValue={q}
            placeholder="Package name"
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
          />
        </label>
        <label className="flex w-56 flex-col gap-1.5 text-sm">
          <span className="text-white/50">Status</span>
          <select
            name="status"
            defaultValue={status}
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
          >
            <option value="">All statuses</option>
            {ORDER_STATUSES.map((item) => (
              <option key={item} value={item}>
                {ORDER_STATUS_LABELS[item]}
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
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="bg-white/5 text-white/60">
            <tr>
              <th className="px-4 py-3 font-medium">Package</th>
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium">Contracted</th>
              <th className="px-4 py-3 font-medium">Ordered</th>
              <th className="px-4 py-3 font-medium">Assigned</th>
              <th className="px-4 py-3 font-medium">Completed</th>
              <th className="px-4 py-3 font-medium">Delivered</th>
              <th className="px-4 py-3 font-medium">Remaining</th>
              <th className="px-4 py-3 font-medium">Outstanding</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-white/50">
                  No packages match this filter.
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} className="border-t border-white/10">
                  <td className="px-4 py-3">
                    <Link href={`/orders/${order.id}`} className="hover:text-brand">
                      {order.packageName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-white/80">{order.companyName}</td>
                  <td className="px-4 py-3 text-white/70">{order.contractedVideoCount}</td>
                  <td className="px-4 py-3 text-white/70">{order.production.ordered}</td>
                  <td className="px-4 py-3 text-white/70">{order.production.assigned}</td>
                  <td className="px-4 py-3 text-white/70">{order.production.completed}</td>
                  <td className="px-4 py-3 text-white/70">{order.production.delivered}</td>
                  <td className="px-4 py-3 text-white/70">{order.production.remaining}</td>
                  <td className="px-4 py-3 text-white/70">
                    {formatMoney(order.outstandingBalance ?? 0)}
                  </td>
                  <td className="px-4 py-3">
                    <OrderStatusBadge status={order.status} />
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
