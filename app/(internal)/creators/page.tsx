import Link from "next/link";
import { loadCreatorList } from "@/lib/creators/hub";
import { pageCanWrite, requirePageAccess } from "@/lib/page-auth";
import {
  CREATOR_AVAILABILITY_STATUSES,
  CREATOR_AVAILABILITY_LABELS,
} from "@/lib/status";
import { CreatorAvailabilityBadge } from "@/components/status-badge";

export default async function CreatorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; availability?: string }>;
}) {
  const auth = await requirePageAccess("creators", "read");
  const canWrite = pageCanWrite(auth, "creators");
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const availability = params.availability ?? "";

  const creators = await loadCreatorList({
    q: q || undefined,
    availability: availability || undefined,
    includePayout: false,
  });

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Creators</h1>
          <p className="mt-1 text-sm text-white/60">
            {creators.length} record{creators.length === 1 ? "" : "s"}
          </p>
        </div>
        {canWrite ? (
          <Link
            href="/creators/new"
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-charcoal"
          >
            Add creator
          </Link>
        ) : null}
      </div>

      <form className="flex flex-wrap items-end gap-3" action="/creators">
        <label className="flex min-w-64 flex-1 flex-col gap-1.5 text-sm">
          <span className="text-white/50">Search</span>
          <input
            name="q"
            defaultValue={q}
            placeholder="Name, location, niche, language"
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
          />
        </label>
        <label className="flex w-56 flex-col gap-1.5 text-sm">
          <span className="text-white/50">Availability</span>
          <select
            name="availability"
            defaultValue={availability}
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
          >
            <option value="">All</option>
            {CREATOR_AVAILABILITY_STATUSES.map((item) => (
              <option key={item} value={item}>
                {CREATOR_AVAILABILITY_LABELS[item]}
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
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-white/5 text-white/60">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Location</th>
              <th className="px-4 py-3 font-medium">Languages</th>
              <th className="px-4 py-3 font-medium">Niches</th>
              <th className="px-4 py-3 font-medium">Rate</th>
              <th className="px-4 py-3 font-medium">Availability</th>
            </tr>
          </thead>
          <tbody>
            {creators.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-white/50">
                  No creators match this filter.
                </td>
              </tr>
            ) : (
              creators.map((creator) => (
                <tr key={creator.id} className="border-t border-white/10">
                  <td className="px-4 py-3">
                    <Link href={`/creators/${creator.id}`} className="hover:text-brand">
                      {creator.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-white/70">{creator.location || "—"}</td>
                  <td className="px-4 py-3 text-white/70">
                    {creator.languages.join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-white/70">
                    {creator.niches.join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-white/70">{creator.rate}</td>
                  <td className="px-4 py-3">
                    <CreatorAvailabilityBadge status={creator.availability} />
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
