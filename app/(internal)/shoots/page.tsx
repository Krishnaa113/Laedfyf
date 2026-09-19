import Link from "next/link";
import { loadShootList } from "@/lib/shoots/hub";
import {
  calendarRange,
  parseCalendarDate,
  parseCalendarView,
} from "@/lib/shoots/calendar";
import { pageCanWrite, requirePageAccess } from "@/lib/page-auth";
import { SHOOT_STATUSES, SHOOT_STATUS_LABELS } from "@/lib/status";
import { ShootCalendar } from "@/components/shoots/shoot-calendar";
import { ShootStatusBadge } from "@/components/status-badge";

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

function withParams(
  base: Record<string, string | undefined>,
  extra: Record<string, string | undefined>,
) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...base, ...extra })) {
    if (value) {
      search.set(key, value);
    }
  }
  const query = search.toString();
  return query ? `/shoots?${query}` : "/shoots";
}

export default async function ShootsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    creatorId?: string;
    view?: string;
    date?: string;
    layout?: string;
  }>;
}) {
  const auth = await requirePageAccess("shoots", "read");
  const canWrite = pageCanWrite(auth, "shoots");
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const status = params.status ?? "";
  const creatorId = params.creatorId ?? "";
  const layout = params.layout === "list" ? "list" : "calendar";
  const view = parseCalendarView(params.view);
  const date = parseCalendarDate(params.date);
  const range = calendarRange(view, date);

  const shoots = await loadShootList(auth, {
    q: q || undefined,
    status: status || undefined,
    creatorId: creatorId || undefined,
    ...(layout === "calendar"
      ? { from: new Date(range.from), to: new Date(range.to) }
      : {}),
  });

  const filterState = {
    q: q || undefined,
    status: status || undefined,
    creatorId: creatorId || undefined,
    view,
    date,
  };

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Shoot scheduling</h1>
          <p className="mt-1 text-sm text-white/60">
            {shoots.length === 1 ? "1 shoot" : `${shoots.length} shoots`} in this{" "}
            {layout === "calendar" ? `${view} view` : "list"} · overlapping creator
            bookings are blocked
          </p>
        </div>
        {canWrite ? (
          <Link
            href={creatorId ? `/shoots/new?creatorId=${creatorId}` : "/shoots/new"}
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-charcoal"
          >
            Book shoot
          </Link>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={withParams(filterState, { layout: "calendar" })}
          className={`rounded-md px-3 py-1.5 text-sm ${
            layout === "calendar"
              ? "bg-brand text-charcoal"
              : "border border-white/15 hover:border-brand hover:text-brand"
          }`}
        >
          Calendar
        </Link>
        <Link
          href={withParams(filterState, { layout: "list" })}
          className={`rounded-md px-3 py-1.5 text-sm ${
            layout === "list"
              ? "bg-brand text-charcoal"
              : "border border-white/15 hover:border-brand hover:text-brand"
          }`}
        >
          List
        </Link>
      </div>

      <form className="flex flex-wrap items-end gap-3" action="/shoots">
        {creatorId ? <input type="hidden" name="creatorId" value={creatorId} /> : null}
        <input type="hidden" name="layout" value={layout} />
        <input type="hidden" name="view" value={view} />
        <input type="hidden" name="date" value={date} />
        <label className="flex min-w-64 flex-1 flex-col gap-1.5 text-sm">
          <span className="text-white/50">Location</span>
          <input
            name="q"
            defaultValue={q}
            placeholder="Search location"
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
            {SHOOT_STATUSES.map((item) => (
              <option key={item} value={item}>
                {SHOOT_STATUS_LABELS[item]}
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

      {layout === "calendar" ? (
        <ShootCalendar
          shoots={shoots}
          view={view}
          date={date}
          q={q}
          status={status}
          creatorId={creatorId}
        />
      ) : (
        <section className="overflow-hidden rounded-lg border border-white/10">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="bg-white/5 text-white/60">
              <tr>
                <th className="px-4 py-3 font-medium">Starts</th>
                <th className="px-4 py-3 font-medium">Ends</th>
                <th className="px-4 py-3 font-medium">Creator</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {shoots.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-white/50">
                    No shoots match this filter.
                  </td>
                </tr>
              ) : (
                shoots.map((shoot) => (
                  <tr key={shoot.id} className="border-t border-white/10">
                    <td className="px-4 py-3">
                      <Link href={`/shoots/${shoot.id}`} className="hover:text-brand">
                        {formatDate(shoot.scheduledAt)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-white/70">{formatDate(shoot.endsAt)}</td>
                    <td className="px-4 py-3 text-white/70">
                      {shoot.creatorId ? (
                        <Link href={`/creators/${shoot.creatorId}`} className="hover:text-brand">
                          {shoot.creatorName || "Creator"}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-white/70">{shoot.companyName || "—"}</td>
                    <td className="px-4 py-3 text-white/70">{shoot.location || "—"}</td>
                    <td className="px-4 py-3">
                      <ShootStatusBadge status={shoot.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}
