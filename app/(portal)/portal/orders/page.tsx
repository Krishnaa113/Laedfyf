import Link from "next/link";
import { loadOrderList } from "@/lib/orders/hub";
import { requirePortalAccess } from "@/lib/page-auth";
import { formatPortalDate } from "@/lib/portal/format";
import { ACTIVE_ORDER_STATUSES } from "@/lib/status";
import { OrderStatusBadge } from "@/components/status-badge";

export default async function PortalOrdersPage() {
  const auth = await requirePortalAccess("orders", "read");
  const orders = await loadOrderList(auth);
  const active = orders.filter((order) => ACTIVE_ORDER_STATUSES.includes(order.status));
  const completed = orders.filter((order) => !ACTIVE_ORDER_STATUSES.includes(order.status));

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold">Orders</h1>
        <p className="mt-1 text-sm text-white/60">
          Production progress for packages assigned to your account.
        </p>
      </div>

      <OrderTable title="Active" orders={active} empty="No active orders." />
      <OrderTable title="Completed" orders={completed} empty="No completed orders." />
    </main>
  );
}

function OrderTable({
  title,
  orders,
  empty,
}: {
  title: string;
  orders: Awaited<ReturnType<typeof loadOrderList>>;
  empty: string;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-white/10">
      <div className="border-b border-white/10 px-4 py-3">
        <h2 className="text-sm font-medium">{title}</h2>
      </div>
      <table className="w-full text-left text-sm">
        <thead className="bg-white/5 text-white/60">
          <tr>
            <th className="px-4 py-3 font-medium">Package</th>
            <th className="px-4 py-3 font-medium">Progress</th>
            <th className="px-4 py-3 font-medium">Due</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {orders.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-white/50">
                {empty}
              </td>
            </tr>
          ) : (
            orders.map((order) => (
              <tr key={order.id} className="border-t border-white/10">
                <td className="px-4 py-3">
                  <Link href={`/portal/orders/${order.id}`} className="hover:text-brand">
                    {order.packageName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-white/70">
                  {order.production.delivered}/{order.contractedVideoCount} delivered
                  {" · "}
                  {order.production.remaining} remaining
                </td>
                <td className="px-4 py-3 text-white/70">{formatPortalDate(order.dueDate)}</td>
                <td className="px-4 py-3">
                  <OrderStatusBadge status={order.status} />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}
