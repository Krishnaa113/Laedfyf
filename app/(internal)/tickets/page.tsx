import Link from "next/link";
import { loadTicketList } from "@/lib/tickets/hub";
import { requirePageAccess } from "@/lib/page-auth";
import { TICKET_STATUSES, TICKET_STATUS_LABELS } from "@/lib/status";
import { TicketStatusBadge } from "@/components/status-badge";

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function TicketsInboxPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const auth = await requirePageAccess("tickets", "read");
  const params = await searchParams;
  const tickets = await loadTicketList(auth, {
    status: params.status || undefined,
  });

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold">Tickets</h1>
        <p className="mt-1 text-sm text-white/60">
          Internal inbox for client support. Portal users keep their own thread.
        </p>
      </div>
      <form className="flex flex-wrap items-end gap-3" action="/tickets">
        <label className="flex w-48 flex-col gap-1.5 text-sm">
          <span className="text-white/50">Status</span>
          <select
            name="status"
            defaultValue={params.status ?? ""}
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
          >
            <option value="">All statuses</option>
            {TICKET_STATUSES.map((status) => (
              <option key={status} value={status}>
                {TICKET_STATUS_LABELS[status]}
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
              <th className="px-4 py-3 font-medium">Subject</th>
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium">Package</th>
              <th className="px-4 py-3 font-medium">Opened</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {tickets.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-white/50">
                  No tickets in this inbox.
                </td>
              </tr>
            ) : (
              tickets.map((ticket) => (
                <tr key={ticket.id} className="border-t border-white/10">
                  <td className="px-4 py-3">
                    <Link href={`/tickets/${ticket.id}`} className="hover:text-brand">
                      {ticket.subject}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-white/70">{ticket.companyName || "—"}</td>
                  <td className="px-4 py-3 text-white/70">{ticket.packageName || "—"}</td>
                  <td className="px-4 py-3 text-white/70">{formatDate(ticket.createdAt)}</td>
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
