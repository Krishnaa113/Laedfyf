import Link from "next/link";
import { loadClientList } from "@/lib/clients/hub";
import { pageCanWrite, requirePageAccess } from "@/lib/page-auth";
import { canManageClientInvites } from "@/lib/roles";
import { CLIENT_STATUSES, CLIENT_STATUS_LABELS } from "@/lib/status";
import { ClientsInviteTable } from "@/components/clients/clients-invite-table";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const auth = await requirePageAccess("clients", "read");
  const canWrite = pageCanWrite(auth, "clients");
  const canManageInvites = canManageClientInvites(auth.session.user.role);
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const status = params.status ?? "";

  const clients = await loadClientList(auth, {
    q: q || undefined,
    status: status || undefined,
  });

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Clients</h1>
          <p className="mt-1 text-sm text-white/60">
            {clients.length} record{clients.length === 1 ? "" : "s"}
          </p>
        </div>
        {canWrite ? (
          <Link
            href="/clients/new"
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-charcoal"
          >
            Add client
          </Link>
        ) : null}
      </div>

      <form className="flex flex-wrap items-end gap-3" action="/clients">
        <label className="flex min-w-64 flex-1 flex-col gap-1.5 text-sm">
          <span className="text-white/50">Search</span>
          <input
            name="q"
            defaultValue={q}
            placeholder="Name, company, email, brand, phone"
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
          />
        </label>
        <label className="flex w-48 flex-col gap-1.5 text-sm">
          <span className="text-white/50">Status</span>
          <select
            name="status"
            defaultValue={status}
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
          >
            <option value="">All statuses</option>
            {CLIENT_STATUSES.map((item) => (
              <option key={item} value={item}>
                {CLIENT_STATUS_LABELS[item]}
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

      <ClientsInviteTable
        canManageInvites={canManageInvites}
        clients={clients.map((client) => ({
          id: client.id,
          name: client.name,
          companyName: client.companyName,
          brandName: client.brandName,
          email: client.email,
          phone: client.phone,
          whatsapp: client.whatsapp,
          assignedEmployeeName: client.assignedEmployeeName,
          source: client.source,
          status: client.status,
          passwordSet: client.passwordSet,
          portalPassword:
            "portalPassword" in client ? client.portalPassword : null,
        }))}
      />
    </main>
  );
}
