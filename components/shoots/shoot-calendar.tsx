import Link from "next/link";
import type { SerializedShoot } from "@/lib/serialize";
import {
  CALENDAR_VIEWS,
  calendarHours,
  calendarRange,
  enumerateUtcDays,
  formatUtcClock,
  formatUtcDayLabel,
  formatUtcMonthLabel,
  shiftCalendarDate,
  startOfUtcMonth,
  utcDateKey,
  utcHour,
  type CalendarView,
} from "@/lib/shoots/calendar";
import { ShootStatusBadge } from "@/components/status-badge";

function shootsHref(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      search.set(key, value);
    }
  }
  const query = search.toString();
  return query ? `/shoots?${query}` : "/shoots";
}

function groupByDay(shoots: SerializedShoot[]) {
  const grouped = new Map<string, SerializedShoot[]>();
  for (const shoot of shoots) {
    const key = utcDateKey(shoot.scheduledAt);
    if (!key) {
      continue;
    }
    const list = grouped.get(key) ?? [];
    list.push(shoot);
    grouped.set(key, list);
  }
  for (const list of grouped.values()) {
    list.sort((a, b) => String(a.scheduledAt).localeCompare(String(b.scheduledAt)));
  }
  return grouped;
}

function ShootChip({ shoot }: { shoot: SerializedShoot }) {
  return (
    <Link
      href={`/shoots/${shoot.id}`}
      className="block rounded-md border border-brand/30 bg-brand/10 px-2 py-1 text-left hover:border-brand"
    >
      <p className="truncate text-xs font-medium text-brand">
        {formatUtcClock(shoot.scheduledAt)} · {shoot.creatorName || "Unassigned"}
      </p>
      <p className="truncate text-[11px] text-white/70">
        {shoot.location || shoot.companyName || "Shoot"}
      </p>
    </Link>
  );
}

export function ShootCalendar({
  shoots,
  view,
  date,
  q,
  status,
  creatorId,
}: {
  shoots: SerializedShoot[];
  view: CalendarView;
  date: string;
  q: string;
  status: string;
  creatorId: string;
}) {
  const range = calendarRange(view, date);
  const days = enumerateUtcDays(range.from, range.to);
  const byDay = groupByDay(shoots);
  const hours = calendarHours();
  const today = new Date().toISOString().slice(0, 10);
  const filters = { q, status, creatorId, layout: "calendar" };

  function hrefFor(next: { view?: CalendarView; date?: string; layout?: string }) {
    return shootsHref({
      ...filters,
      view: next.view ?? view,
      date: next.date ?? date,
      layout: next.layout,
    });
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link
            href={hrefFor({ date: shiftCalendarDate(view, date, -1) })}
            className="rounded-md border border-white/15 px-3 py-1.5 text-sm hover:border-brand hover:text-brand"
          >
            Prev
          </Link>
          <Link
            href={hrefFor({ date: today })}
            className="rounded-md border border-white/15 px-3 py-1.5 text-sm hover:border-brand hover:text-brand"
          >
            Today
          </Link>
          <Link
            href={hrefFor({ date: shiftCalendarDate(view, date, 1) })}
            className="rounded-md border border-white/15 px-3 py-1.5 text-sm hover:border-brand hover:text-brand"
          >
            Next
          </Link>
        </div>
        <h2 className="text-lg font-medium">
          {view === "month"
            ? formatUtcMonthLabel(date)
            : view === "week"
              ? `${formatUtcDayLabel(days[0] ?? date)} – ${formatUtcDayLabel(days[days.length - 1] ?? date)}`
              : formatUtcDayLabel(date)}
        </h2>
        <div className="flex items-center gap-2">
          {CALENDAR_VIEWS.map((item) => (
            <Link
              key={item}
              href={hrefFor({ view: item })}
              className={`rounded-md px-3 py-1.5 text-sm capitalize ${
                item === view
                  ? "bg-brand text-charcoal"
                  : "border border-white/15 hover:border-brand hover:text-brand"
              }`}
            >
              {item}
            </Link>
          ))}
        </div>
      </div>

      {view === "month" ? (
        <div className="overflow-hidden rounded-lg border border-white/10">
          <div className="grid grid-cols-7 bg-white/5 text-center text-xs uppercase tracking-wide text-white/50">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => (
              <div key={label} className="px-2 py-2">
                {label}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const inMonth = day.slice(0, 7) === startOfUtcMonth(date).slice(0, 7);
              const events = byDay.get(day) ?? [];
              return (
                <div
                  key={day}
                  className={`min-h-32 border-t border-r border-white/10 p-2 ${
                    inMonth ? "bg-transparent" : "bg-white/[0.02] text-white/40"
                  } ${day === today ? "ring-1 ring-inset ring-brand/60" : ""}`}
                >
                  <Link
                    href={hrefFor({ view: "day", date: day })}
                    className="mb-2 inline-block text-xs hover:text-brand"
                  >
                    {day.slice(8)}
                  </Link>
                  <div className="flex flex-col gap-1">
                    {events.slice(0, 3).map((shoot) => (
                      <ShootChip key={shoot.id} shoot={shoot} />
                    ))}
                    {events.length > 3 ? (
                      <p className="text-[11px] text-white/50">+{events.length - 3} more</p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : view === "week" ? (
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <div
            className="grid min-w-[980px]"
            style={{ gridTemplateColumns: "4.5rem repeat(7, minmax(0, 1fr))" }}
          >
            <div className="border-b border-white/10 bg-white/5" />
            {days.map((day) => (
              <Link
                key={day}
                href={hrefFor({ view: "day", date: day })}
                className={`border-b border-l border-white/10 bg-white/5 px-2 py-2 text-xs hover:text-brand ${
                  day === today ? "text-brand" : "text-white/60"
                }`}
              >
                {formatUtcDayLabel(day)}
              </Link>
            ))}
            {hours.map((hour) => (
              <HourRow
                key={hour}
                hour={hour}
                days={days}
                byDay={byDay}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-white/10">
          <div className="grid" style={{ gridTemplateColumns: "4.5rem minmax(0, 1fr)" }}>
            {hours.map((hour) => {
              const events = (byDay.get(date) ?? []).filter(
                (shoot) => utcHour(shoot.scheduledAt) === hour,
              );
              return (
                <div key={hour} className="contents">
                  <div className="border-t border-white/10 px-2 py-3 text-xs text-white/40">
                    {String(hour).padStart(2, "0")}:00
                  </div>
                  <div className="min-h-16 border-t border-l border-white/10 p-2">
                    <div className="flex flex-col gap-1">
                      {events.map((shoot) => (
                        <Link
                          key={shoot.id}
                          href={`/shoots/${shoot.id}`}
                          className="rounded-md border border-brand/30 bg-brand/10 px-3 py-2 hover:border-brand"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium">
                              {`${formatUtcClock(shoot.scheduledAt)}${shoot.endsAt ? `–${formatUtcClock(shoot.endsAt)}` : ""}`}{" "}
                              {shoot.location || "Shoot"}
                            </p>
                            <ShootStatusBadge status={shoot.status} />
                          </div>
                          <p className="mt-1 text-xs text-white/60">
                            {shoot.creatorName || "Unassigned creator"} ·{" "}
                            {shoot.companyName || "No client"}
                          </p>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

function HourRow({
  hour,
  days,
  byDay,
}: {
  hour: number;
  days: string[];
  byDay: Map<string, SerializedShoot[]>;
}) {
  return (
    <>
      <div className="border-t border-white/10 px-2 py-2 text-xs text-white/40">
        {String(hour).padStart(2, "0")}:00
      </div>
      {days.map((day) => {
        const events = (byDay.get(day) ?? []).filter(
          (shoot) => utcHour(shoot.scheduledAt) === hour,
        );
        return (
          <div key={`${day}-${hour}`} className="min-h-14 border-t border-l border-white/10 p-1">
            <div className="flex flex-col gap-1">
              {events.map((shoot) => (
                <ShootChip key={shoot.id} shoot={shoot} />
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}
