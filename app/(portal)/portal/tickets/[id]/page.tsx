import Link from "next/link";
import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { loadTicketHub } from "@/lib/tickets/hub";
import { requirePortalAccess } from "@/lib/page-auth";
import { formatPortalDate } from "@/lib/portal/format";
import { TicketStatusBadge } from "@/components/status-badge";

export default async function PortalTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const auth = await requirePortalAccess("tickets", "read");
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
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div>
        <Link href="/portal/tickets" className="text-sm text-white/50 hover:text-brand">
          Back to support
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{ticket.subject}</h1>
          <TicketStatusBadge status={ticket.status} />
        </div>
        <p className="mt-1 text-sm text-white/60">
          Opened {formatPortalDate(ticket.createdAt)}
          {ticket.packageName ? ` · ${ticket.packageName}` : ""}
        </p>
      </div>
      <section className="rounded-lg border border-white/10 p-6">
        <h2 className="text-lg font-medium">Message</h2>
        <p className="mt-3 whitespace-pre-wrap text-sm text-white/80">
          {ticket.body || "No details provided."}
        </p>
      </section>
    </main>
  );
}
