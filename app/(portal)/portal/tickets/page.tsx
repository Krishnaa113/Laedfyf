import Link from "next/link";
import { loadOrderList } from "@/lib/orders/hub";
import { loadTicketList } from "@/lib/tickets/hub";
import { requirePortalAccess } from "@/lib/page-auth";
import { formatPortalDate } from "@/lib/portal/format";
import { TicketCreateForm } from "@/components/portal/ticket-create-form";
import { TicketStatusBadge } from "@/components/status-badge";

export default async function PortalTicketsPage() {
  const auth = await requirePortalAccess("tickets", "read");
  const [tickets, orders] = await Promise.all([
    loadTicketList(auth),
    loadOrderList(auth),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold">Support</h1>
        <p className="mt-1 text-sm text-white/60">
          Create a ticket and track status for your account only.
        </p>
      </div>

      <TicketCreateForm
        orders={orders.map((order) => ({ id: order.id, packageName: order.packageName }))}
      />

      <section className="overflow-hidden rounded-lg border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-white/60">
            <tr>
              <th className="px-4 py-3 font-medium">Subject</th>
              <th className="px-4 py-3 font-medium">Package</th>
              <th className="px-4 py-3 font-medium">Opened</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {tickets.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-white/50">
                  No tickets yet.
                </td>
              </tr>
            ) : (
              tickets.map((ticket) => (
                <tr key={ticket.id} className="border-t border-white/10">
                  <td className="px-4 py-3">
                    <Link href={`/portal/tickets/${ticket.id}`} className="hover:text-brand">
                      {ticket.subject}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-white/70">{ticket.packageName || "—"}</td>
                  <td className="px-4 py-3 text-white/70">
                    {formatPortalDate(ticket.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <TicketStatusBadge status={ticket.status} />
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
