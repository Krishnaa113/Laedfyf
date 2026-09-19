import Link from "next/link";
import { loadScriptList } from "@/lib/scripts/hub";
import { requirePortalAccess } from "@/lib/page-auth";
import { CLIENT_VISIBLE_SCRIPT_STATUSES } from "@/lib/status";
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

export default async function PortalScriptsPage() {
  const auth = await requirePortalAccess("scripts", "read");
  const scripts = (await loadScriptList(auth)).filter((script) =>
    CLIENT_VISIBLE_SCRIPT_STATUSES.includes(script.status),
  );

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold">Scripts</h1>
        <p className="mt-1 text-sm text-white/60">
          Scripts sent to you for review, plus approved drafts.
        </p>
      </div>

      <section className="overflow-hidden rounded-lg border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-white/60">
            <tr>
              <th className="px-4 py-3 font-medium">Video</th>
              <th className="px-4 py-3 font-medium">Package</th>
              <th className="px-4 py-3 font-medium">Language</th>
              <th className="px-4 py-3 font-medium">Deadline</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {scripts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-white/50">
                  No scripts are waiting for you yet.
                </td>
              </tr>
            ) : (
              scripts.map((script) => (
                <tr key={script.id} className="border-t border-white/10">
                  <td className="px-4 py-3">
                    <Link
                      href={`/portal/scripts/${script.id}`}
                      className="hover:text-brand"
                    >
                      #{script.videoNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-white/70">
                    {script.packageName || "—"}
                  </td>
                  <td className="px-4 py-3 text-white/70">
                    {script.language || "—"}
                  </td>
                  <td className="px-4 py-3 text-white/70">
                    {formatDate(script.deadline)}
                  </td>
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
