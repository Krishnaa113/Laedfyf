import Link from "next/link";
import { loadOrderList } from "@/lib/orders/hub";
import { loadPaymentList } from "@/lib/payments/hub";
import { loadScriptList } from "@/lib/scripts/hub";
import { loadTicketList } from "@/lib/tickets/hub";
import { loadVideoList } from "@/lib/videos/hub";
import { requirePortalAccess } from "@/lib/page-auth";
import {
  ACTIVE_ORDER_STATUSES,
} from "@/lib/status";
import { OrderStatusBadge } from "@/components/status-badge";

export default async function PortalHomePage() {
  const auth = await requirePortalAccess("orders", "read");
  const [orders, scripts, videos, invoices, tickets] = await Promise.all([
    loadOrderList(auth),
    loadScriptList(auth),
    loadVideoList(auth),
    loadPaymentList(auth),
    loadTicketList(auth),
  ]);

  const activeOrders = orders.filter((order) =>
    ACTIVE_ORDER_STATUSES.includes(order.status),
  );
  const scriptsWaiting = scripts.filter(
    (script) => script.status === "Sent to Client",
  ).length;
  const videosWaiting = videos.filter(
    (video) => video.status === "Client Review",
  ).length;
  const openTickets = tickets.filter((ticket) => ticket.status !== "Resolved").length;
  const unpaidInvoices = invoices.filter((invoice) => invoice.status !== "Paid").length;

  return (
    <main className="mx-auto flex min-h-full w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold">Client portal</h1>
        <p className="mt-1 text-sm text-white/60">
          Signed in as {auth.session.user.name || auth.session.user.email}
        </p>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat href="/portal/scripts" label="Scripts to review" value={scriptsWaiting} />
        <Stat href="/portal/videos" label="Videos to review" value={videosWaiting} />
        <Stat href="/portal/invoices" label="Open invoices" value={unpaidInvoices} />
        <Stat href="/portal/tickets" label="Open tickets" value={openTickets} />
      </section>

      <section className="rounded-lg border border-white/10">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-medium">Active orders</h2>
          <Link href="/portal/orders" className="text-xs text-brand hover:underline">
            View all
          </Link>
        </div>
        {activeOrders.length === 0 ? (
          <p className="px-4 py-6 text-sm text-white/50">No active orders yet.</p>
        ) : (
          <ul className="divide-y divide-white/10">
            {activeOrders.map((order) => (
              <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <Link href={`/portal/orders/${order.id}`} className="text-sm hover:text-brand">
                    {order.packageName}
                  </Link>
                  <p className="mt-1 text-xs text-white/50">
                    {order.production.delivered}/{order.contractedVideoCount} delivered
                    {" · "}
                    {order.production.remaining} remaining
                  </p>
                </div>
                <OrderStatusBadge status={order.status} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-sm text-white/50">
        You only see work assigned to your account. Internal pricing and staffing
        stay off this portal.
      </p>
    </main>
  );
}

function Stat({
  href,
  label,
  value,
}: {
  href: string;
  label: string;
  value: number;
}) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-white/10 p-4 hover:border-brand/40"
    >
      <p className="text-xs uppercase tracking-wide text-white/40">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </Link>
  );
}
