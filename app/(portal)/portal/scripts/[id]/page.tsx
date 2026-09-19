import Link from "next/link";
import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { loadScriptHub } from "@/lib/scripts/hub";
import { requirePortalAccess } from "@/lib/page-auth";
import { CLIENT_VISIBLE_SCRIPT_STATUSES } from "@/lib/status";
import { ScriptStatusBadge } from "@/components/status-badge";
import { ScriptReviewPanel } from "@/components/portal/script-review";

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

export default async function PortalScriptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const auth = await requirePortalAccess("scripts", "read");
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    notFound();
  }

  const result = await loadScriptHub(auth, id);
  if (!result.ok) {
    notFound();
  }

  const { script } = result.hub;
  if (!CLIENT_VISIBLE_SCRIPT_STATUSES.includes(script.status)) {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div>
        <Link
          href="/portal/scripts"
          className="text-sm text-white/50 hover:text-brand"
        >
          Back to scripts
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">Video #{script.videoNumber}</h1>
          <ScriptStatusBadge status={script.status} />
        </div>
        <p className="mt-1 text-white/70">
          {script.packageName || "Package"}
          {script.language ? ` · ${script.language}` : ""}
        </p>
      </div>

      <section className="grid gap-4 rounded-lg border border-white/10 p-6 md:grid-cols-3">
        <Info label="Deadline" value={formatDate(script.deadline)} />
        <Info label="Revision count" value={String(script.revisionCount)} />
        <Info label="Creator" value={script.creatorName || "—"} />
      </section>

      <section className="rounded-lg border border-white/10 p-6">
        <h2 className="text-lg font-medium">Script</h2>
        <p className="mt-3 whitespace-pre-wrap text-sm text-white/80">
          {script.scriptText || "No script text yet."}
        </p>
      </section>

      {script.referenceLinks.length > 0 ? (
        <section className="rounded-lg border border-white/10 p-6">
          <h2 className="text-lg font-medium">Reference links</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
            {script.referenceLinks.map((link) => (
              <li key={link}>
                <a
                  href={link}
                  className="text-brand hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {link}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <ScriptReviewPanel script={script} />
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-white/40">{label}</p>
      <p className="mt-1 text-sm">{value || "—"}</p>
    </div>
  );
}
