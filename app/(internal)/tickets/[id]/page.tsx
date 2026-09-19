import Link from "next/link";
import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { loadTicketHub } from "@/lib/tickets/hub";
import { pageCanWrite, requirePageAccess } from "@/lib/page-auth";
import { TicketStatusBadge } from "@/components/status-badge";
import { TicketStatusForm } from "@/components/tickets/ticket-status-form";

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

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const auth = await requirePageAccess("tickets", "read");
  const canWrite = pageCanWrite(auth, "tickets");
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    notFound();
  }

  const result = await loadTicketHub(auth, id);
  if (!result.ok) {
    notFound();
  }

  const { ticket } = result.hub;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/tickets" className="text-sm text-white/50 hover:text-brand">
            Back to tickets
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">{ticket.subject}</h1>
          <p className="mt-1 text-sm text-white/60">
            {ticket.companyName || "Client"}
            {ticket.packageName ? ` · ${ticket.packageName}` : ""}
            {" · "}
            Opened {formatDate(ticket.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <TicketStatusBadge status={ticket.status} />
          {canWrite ? (
            <TicketStatusForm ticketId={ticket.id} status={ticket.status} />
          ) : null}
        </div>
      </div>
      <section className="rounded-lg border border-white/10 p-6">
        <h2 className="text-lg font-medium">Message</h2>
        <p className="mt-3 whitespace-pre-wrap text-sm text-white/80">
          {ticket.body || "No details provided."}
        </p>
      </section>
      <section className="grid gap-4 rounded-lg border border-white/10 p-6 md:grid-cols-3">
        <Info
          label="Client"
          value={
            ticket.clientId ? (
              <Link href={`/clients/${ticket.clientId}`} className="hover:text-brand">
                {ticket.companyName || "Client"}
              </Link>
            ) : (
              "—"
            )
          }
        />
        <Info label="Assigned" value={ticket.assignedEmployeeName || "Unassigned"} />
        <Info label="Status" value={ticket.status} />
      </section>
    </main>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-white/40">{label}</p>
      <p className="mt-1 text-sm">{value}</p>
    </div>
  );
}
