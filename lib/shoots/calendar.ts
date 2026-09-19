export const CALENDAR_VIEWS = ["day", "week", "month"] as const;

export type CalendarView = (typeof CALENDAR_VIEWS)[number];

export const CALENDAR_START_HOUR = 7;
export const CALENDAR_END_HOUR = 21;

export function parseCalendarView(value: unknown): CalendarView {
  if (value === "day" || value === "week" || value === "month") {
    return value;
  }
  return "week";
}

export function parseCalendarDate(value: unknown): string {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  return new Date().toISOString().slice(0, 10);
}

function utcDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function addUtcDays(isoDate: string, days: number) {
  const date = utcDate(isoDate);
  date.setUTCDate(date.getUTCDate() + days);
  return toIsoDate(date);
}

export function startOfUtcWeek(isoDate: string) {
  const date = utcDate(isoDate);
  const weekday = date.getUTCDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  date.setUTCDate(date.getUTCDate() + mondayOffset);
  return toIsoDate(date);
}

export function startOfUtcMonth(isoDate: string) {
  return `${isoDate.slice(0, 7)}-01`;
}

export function shiftCalendarDate(view: CalendarView, isoDate: string, delta: number) {
  if (view === "day") {
    return addUtcDays(isoDate, delta);
  }
  if (view === "week") {
    return addUtcDays(isoDate, delta * 7);
  }
  const date = utcDate(startOfUtcMonth(isoDate));
  date.setUTCMonth(date.getUTCMonth() + delta);
  return toIsoDate(date);
}

export function calendarRange(view: CalendarView, isoDate: string) {
  if (view === "day") {
    return {
      from: `${isoDate}T00:00:00.000Z`,
      to: `${addUtcDays(isoDate, 1)}T00:00:00.000Z`,
    };
  }

  if (view === "week") {
    const start = startOfUtcWeek(isoDate);
    return {
      from: `${start}T00:00:00.000Z`,
      to: `${addUtcDays(start, 7)}T00:00:00.000Z`,
    };
  }

  const monthStart = startOfUtcMonth(isoDate);
  const nextMonth = utcDate(monthStart);
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
  const lastDay = addUtcDays(toIsoDate(nextMonth), -1);
  const gridStart = startOfUtcWeek(monthStart);
  const gridEnd = addUtcDays(startOfUtcWeek(lastDay), 7);

  return {
    from: `${gridStart}T00:00:00.000Z`,
    to: `${gridEnd}T00:00:00.000Z`,
  };
}

export function enumerateUtcDays(fromIso: string, toIsoExclusive: string) {
  const days: string[] = [];
  let cursor = fromIso.slice(0, 10);
  const end = toIsoExclusive.slice(0, 10);
  while (cursor < end) {
    days.push(cursor);
    cursor = addUtcDays(cursor, 1);
  }
  return days;
}

export function utcDateKey(value: string | null | undefined) {
  if (!value) {
    return "";
  }
  return value.slice(0, 10);
}

export function utcHour(value: string | null | undefined) {
  if (!value || value.length < 13) {
    return 0;
  }
  return Number(value.slice(11, 13));
}

export function formatUtcClock(value: string | null | undefined) {
  if (!value || value.length < 16) {
    return "—";
  }
  return value.slice(11, 16);
}

export function formatUtcDayLabel(isoDate: string) {
  return new Date(`${isoDate}T00:00:00.000Z`).toLocaleDateString("en-IN", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function formatUtcMonthLabel(isoDate: string) {
  return new Date(`${startOfUtcMonth(isoDate)}T00:00:00.000Z`).toLocaleDateString(
    "en-IN",
    { timeZone: "UTC", month: "long", year: "numeric" },
  );
}

export function calendarHours() {
  return Array.from(
    { length: CALENDAR_END_HOUR - CALENDAR_START_HOUR },
    (_, index) => CALENDAR_START_HOUR + index,
  );
}
