import Link from "next/link";
import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { loadCreatorHub } from "@/lib/creators/hub";
import { pageCanWrite, requirePageAccess } from "@/lib/page-auth";
import { CreatorAvailabilityBadge, ShootStatusBadge } from "@/components/status-badge";
import { CreatorAvailabilityPipeline } from "@/components/creators/availability-pipeline";
import { AvailabilityWindows } from "@/components/creators/availability-windows";
import { DeleteCreatorButton } from "@/components/creators/delete-creator-button";

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

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function CreatorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const auth = await requirePageAccess("creators", "read");
  const canWrite = pageCanWrite(auth, "creators");
  const canWriteShoots = pageCanWrite(auth, "shoots");
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    notFound();
  }

  const hub = await loadCreatorHub(id, { includePayout: true });
  if (!hub) {
    notFound();
  }

  const { creator, shoots, windows } = hub;
  const canWriteAvailability = pageCanWrite(auth, "creator-availability");

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-4">
          {creator.photoUrl ? (
            <img
              src={creator.photoUrl}
              alt=""
              className="size-20 rounded-lg border border-white/10 object-cover"
            />
          ) : (
            <div className="flex size-20 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-lg text-white/40">
              {creator.name.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div>
            <Link href="/creators" className="text-sm text-white/50 hover:text-brand">
              Back to creators
            </Link>
            <h1 className="mt-2 text-2xl font-semibold">{creator.name}</h1>
            <p className="mt-1 text-white/70">{creator.location || "No location"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <CreatorAvailabilityBadge status={creator.availability} />
          {canWrite ? (
            <>
              <Link
                href={`/creators/${creator.id}/edit`}
                className="rounded-md border border-white/15 px-4 py-2 text-sm hover:border-brand hover:text-brand"
              >
                Edit creator
              </Link>
              <DeleteCreatorButton creatorId={creator.id} name={creator.name} />
            </>
          ) : null}
        </div>
      </div>

      <CreatorAvailabilityPipeline
        creatorId={creator.id}
        status={creator.availability}
        canWrite={canWrite}
      />

      <AvailabilityWindows
        creatorId={creator.id}
        windows={windows}
        canWrite={canWriteAvailability}
      />

      <section className="grid gap-4 rounded-lg border border-white/10 p-6 md:grid-cols-3">
        <Info label="Gender" value={creator.gender || "—"} />
        <Info label="Age group" value={creator.ageGroup || "—"} />
        <Info label="Languages" value={creator.languages.join(", ") || "—"} />
        <Info label="Niches" value={creator.niches.join(", ") || "—"} />
        <Info label="Email" value={creator.email || "—"} />
        <Info label="Phone" value={creator.phone || "—"} />
        <Info label="Rate" value={formatMoney(creator.rate)} />
        <Info label="Bank account" value={creator.bankAccountName || "—"} />
        <Info label="Account number" value={creator.bankAccountNumber || "—"} />
        <Info label="UPI ID" value={creator.upiId || "—"} />
        <Info label="Active" value={creator.isActive ? "Yes" : "No"} />
      </section>

      <section className="rounded-lg border border-white/10 p-6">
        <h2 className="text-lg font-medium">Demographics</h2>
        <p className="mt-3 whitespace-pre-wrap text-sm text-white/80">
          {creator.demographics || "No demographics recorded."}
        </p>
      </section>

      <section className="rounded-lg border border-white/10 p-6">
        <h2 className="text-lg font-medium">Portfolio</h2>
        {creator.portfolioLinks.length === 0 ? (
          <p className="mt-3 text-sm text-white/50">No portfolio links.</p>
        ) : (
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
            {creator.portfolioLinks.map((link) => (
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

      <section className="rounded-lg border border-white/10 p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-medium">Shoots</h2>
          {canWriteShoots ? (
            <Link
              href={`/shoots/new?creatorId=${creator.id}`}
              className="text-sm text-brand hover:underline"
            >
              Book shoot
            </Link>
          ) : null}
        </div>
        {shoots.length === 0 ? (
          <p className="mt-3 text-sm text-white/50">No shoots booked yet.</p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-lg border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 text-white/60">
                <tr>
                  <th className="px-4 py-3 font-medium">When</th>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Location</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {shoots.map((shoot) => (
                  <tr key={shoot.id} className="border-t border-white/10">
                    <td className="px-4 py-3">
                      <Link href={`/shoots/${shoot.id}`} className="hover:text-brand">
                        {formatDate(shoot.scheduledAt)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-white/70">{shoot.companyName || "—"}</td>
                    <td className="px-4 py-3 text-white/70">{shoot.location || "—"}</td>
                    <td className="px-4 py-3">
                      <ShootStatusBadge status={shoot.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
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
