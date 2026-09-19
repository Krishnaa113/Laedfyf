import Link from "next/link";
import { loadScriptList } from "@/lib/scripts/hub";
import { pageCanWrite, requirePageAccess } from "@/lib/page-auth";
import { SCRIPT_STATUSES, SCRIPT_STATUS_LABELS } from "@/lib/status";
import { ScriptStatusBadge } from "@/components/status-badge";

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toISOString().slice(0, 10);
}

export default async function ScriptsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; clientId?: string; orderId?: string }>;
}) {
  const auth = await requirePageAccess("scripts", "read");
  const canWrite = pageCanWrite(auth, "scripts");
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const status = params.status ?? "";
  const clientId = params.clientId ?? "";
  const orderId = params.orderId ?? "";

  const scripts = await loadScriptList(auth, {
    q: q || undefined,
    status: status || undefined,
    clientId: clientId || undefined,
    orderId: orderId || undefined,
  });

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Scripts</h1>
          <p className="mt-1 text-sm text-white/60">
            {scripts.length} record{scripts.length === 1 ? "" : "s"}
          </p>
        </div>
        {canWrite ? (
          <Link
            href={
              clientId
                ? `/scripts/new?clientId=${clientId}${orderId ? `&orderId=${orderId}` : ""}`
                : "/scripts/new"
            }
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-charcoal"
          >
            Add script
          </Link>
        ) : null}
      </div>

      <form className="flex flex-wrap items-end gap-3" action="/scripts">
        {clientId ? <input type="hidden" name="clientId" value={clientId} /> : null}
        {orderId ? <input type="hidden" name="orderId" value={orderId} /> : null}
        <label className="flex min-w-64 flex-1 flex-col gap-1.5 text-sm">
          <span className="text-white/50">Search</span>
          <input
            name="q"
            defaultValue={q}
            placeholder="Language, video #, or text"
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
            {SCRIPT_STATUSES.map((item) => (
              <option key={item} value={item}>
                {SCRIPT_STATUS_LABELS[item]}
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
        <table className="w-full min-w-[1000px] text-left text-sm">
          <thead className="bg-white/5 text-white/60">
            <tr>
              <th className="px-4 py-3 font-medium">Video</th>
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium">Package</th>
              <th className="px-4 py-3 font-medium">Writer</th>
              <th className="px-4 py-3 font-medium">Creator</th>
              <th className="px-4 py-3 font-medium">Language</th>
              <th className="px-4 py-3 font-medium">Deadline</th>
              <th className="px-4 py-3 font-medium">Revisions</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {scripts.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-white/50">
                  No scripts match this filter.
                </td>
              </tr>
            ) : (
              scripts.map((script) => (
                <tr key={script.id} className="border-t border-white/10">
                  <td className="px-4 py-3">
                    <Link href={`/scripts/${script.id}`} className="hover:text-brand">
                      #{script.videoNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-white/80">{script.companyName}</td>
                  <td className="px-4 py-3 text-white/70">{script.packageName || "—"}</td>
                  <td className="px-4 py-3 text-white/70">{script.writerName || "—"}</td>
                  <td className="px-4 py-3 text-white/70">{script.creatorName || "—"}</td>
                  <td className="px-4 py-3 text-white/70">{script.language || "—"}</td>
                  <td className="px-4 py-3 text-white/70">{formatDate(script.deadline)}</td>
                  <td className="px-4 py-3 text-white/70">{script.revisionCount}</td>
                  <td className="px-4 py-3">
                    <ScriptStatusBadge status={script.status} />
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
