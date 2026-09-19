import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { loadShootHub } from "@/lib/shoots/hub";
import { pageCanWrite, requirePageAccess } from "@/lib/page-auth";
import { ShootStatusBadge } from "@/components/status-badge";
import { DeleteShootButton } from "@/components/shoots/delete-shoot-button";
import { PreShootChecklist } from "@/components/shoots/pre-shoot-checklist";
import { PostShootChecklist } from "@/components/shoots/post-shoot-checklist";
import { ShootStatusPipeline } from "@/components/shoots/status-pipeline";

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toISOString().slice(0, 16).replace("T", " ");
}

export default async function ShootDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const auth = await requirePageAccess("shoots", "read");
  const canWrite = pageCanWrite(auth, "shoots");
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    notFound();
  }

  const result = await loadShootHub(auth, id);
  if (!result.ok) {
    notFound();
  }

  const { shoot } = result.hub;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/shoots" className="text-sm text-white/50 hover:text-brand">
            Back to shoots
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">
            {shoot.location || "Shoot"}
          </h1>
          <p className="mt-1 text-white/70">
            {shoot.clientId ? (
              <Link href={`/clients/${shoot.clientId}`} className="hover:text-brand">
                {shoot.companyName}
              </Link>
            ) : (
              shoot.companyName
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ShootStatusBadge status={shoot.status} />
          {canWrite ? (
            <>
              <Link
                href={`/shoots/${shoot.id}/edit`}
                className="rounded-md border border-white/15 px-4 py-2 text-sm hover:border-brand hover:text-brand"
              >
                Edit shoot
              </Link>
              <DeleteShootButton
                shootId={shoot.id}
                label={shoot.location || formatDate(shoot.scheduledAt)}
              />
            </>
          ) : null}
        </div>
      </div>

      <ShootStatusPipeline
        shootId={shoot.id}
        status={shoot.status}
        canWrite={canWrite}
      />

      <PreShootChecklist
        shootId={shoot.id}
        checklist={shoot.checklist}
        canWrite={canWrite}
      />

      <PostShootChecklist
        shootId={shoot.id}
        footageUploaded={shoot.footageUploaded}
        rawIntegrityChecked={shoot.rawIntegrityChecked}
        reshootRequired={shoot.reshootRequired}
        canWrite={canWrite}
      />

      <section className="grid gap-4 rounded-lg border border-white/10 p-6 md:grid-cols-3">
        <Info
          label="Creator"
          value={
            shoot.creatorId ? (
              <Link href={`/creators/${shoot.creatorId}`} className="hover:text-brand">
                {shoot.creatorName || "Creator"}
              </Link>
            ) : (
              "—"
            )
          }
        />
        <Info label="Date / time" value={formatDate(shoot.scheduledAt)} />
        <Info label="Ends" value={formatDate(shoot.endsAt)} />
        <Info label="Location" value={shoot.location || "—"} />
        <Info label="Cameraman" value={shoot.cameramanName || "—"} />
        <Info label="Shoot manager" value={shoot.shootManagerName || "—"} />
        <Info label="Shooting assistant" value={shoot.assistantName || "—"} />
        <Info
          label="Order"
          value={
            shoot.orderId ? (
              <Link href={`/orders/${shoot.orderId}`} className="hover:text-brand">
                {shoot.packageName || "Order"}
              </Link>
            ) : (
              "—"
            )
          }
        />
        <Info label="Status" value={shoot.status} />
        <Info
          label="Approved scripts"
          value={
            shoot.approvedScripts.length
              ? shoot.approvedScripts
                  .map((script) => `Video ${script.videoNumber || script.id.slice(-4)}`)
                  .join(", ")
              : "—"
          }
        />
        <Info label="Notes" value={shoot.notes || "—"} />
      </section>
    </main>
  );
}

function Info({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-white/40">{label}</p>
      <p className="mt-1 text-sm">{value || "—"}</p>
    </div>
  );
}
