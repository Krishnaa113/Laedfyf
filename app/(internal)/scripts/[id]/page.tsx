import Link from "next/link";
import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { loadScriptHub } from "@/lib/scripts/hub";
import { pageCanWrite, requirePageAccess } from "@/lib/page-auth";
import { ScriptStatusBadge } from "@/components/status-badge";
import { DeleteScriptButton } from "@/components/scripts/delete-script-button";
import { ScriptStatusPipeline } from "@/components/scripts/status-pipeline";
import { ScriptComments } from "@/components/scripts/comment-thread";

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

export default async function ScriptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const auth = await requirePageAccess("scripts", "read");
  const canWrite = pageCanWrite(auth, "scripts");
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    notFound();
  }

  const result = await loadScriptHub(auth, id);
  if (!result.ok) {
    notFound();
  }

  const { script } = result.hub;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/scripts" className="text-sm text-white/50 hover:text-brand">
            Back to scripts
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">
            Video #{script.videoNumber}
            {script.language ? ` · ${script.language}` : ""}
          </h1>
          <p className="mt-1 text-white/70">
            {script.clientId ? (
              <Link href={`/clients/${script.clientId}`} className="hover:text-brand">
                {script.companyName || script.clientName}
              </Link>
            ) : (
              script.companyName
            )}
            {script.orderId ? (
              <>
                {" · "}
                <Link href={`/orders/${script.orderId}`} className="hover:text-brand">
                  {script.packageName || "Package"}
                </Link>
              </>
            ) : null}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ScriptStatusBadge status={script.status} />
          {canWrite ? (
            <>
              <Link
                href={`/scripts/${script.id}/edit`}
                className="rounded-md border border-white/15 px-4 py-2 text-sm hover:border-brand hover:text-brand"
              >
                Edit script
              </Link>
              <DeleteScriptButton
                scriptId={script.id}
                label={`Video #${script.videoNumber}`}
              />
            </>
          ) : null}
        </div>
      </div>

      <ScriptStatusPipeline
        scriptId={script.id}
        status={script.status}
        canWrite={canWrite}
      />

      <section className="grid gap-4 rounded-lg border border-white/10 p-6 md:grid-cols-3">
        <Info label="Writer" value={script.writerName || "—"} />
        <Info label="Creator" value={script.creatorName || "—"} />
        <Info label="Language" value={script.language || "—"} />
        <Info label="Deadline" value={formatDate(script.deadline)} />
        <Info label="Revision count" value={String(script.revisionCount)} />
        <Info label="Status" value={script.status} />
      </section>

      <section className="rounded-lg border border-white/10 p-6">
        <h2 className="text-lg font-medium">Script text</h2>
        <p className="mt-3 whitespace-pre-wrap text-sm text-white/80">
          {script.scriptText || "No script text yet."}
        </p>
      </section>

      <section className="rounded-lg border border-white/10 p-6">
        <h2 className="text-lg font-medium">Reference links</h2>
        {script.referenceLinks.length === 0 ? (
          <p className="mt-3 text-sm text-white/50">No reference links.</p>
        ) : (
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
        )}
      </section>

      <ScriptComments
        scriptId={script.id}
        comments={script.comments}
        canComment={canWrite}
      />
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
