import {
  addUtcDays,
  parseCalendarDate,
} from "@/lib/shoots/calendar";
import type { SerializedVideo } from "@/lib/serialize";
import { isCompletedVideoStatus } from "@/lib/videos/hub";

export type EditorBucket = "overdue" | "today" | "tomorrow" | "completed";

export function utcDayKey(value: string | null | undefined) {
  if (!value) {
    return "";
  }
  return value.slice(0, 10);
}

export function groupEditorDashboard(videos: SerializedVideo[], today = parseCalendarDate(undefined)) {
  const tomorrow = addUtcDays(today, 1);
  const overdue: SerializedVideo[] = [];
  const dueToday: SerializedVideo[] = [];
  const dueTomorrow: SerializedVideo[] = [];
  const completed: SerializedVideo[] = [];
  const upcoming: SerializedVideo[] = [];

  for (const video of videos) {
    if (isCompletedVideoStatus(video.status)) {
      completed.push(video);
      continue;
    }
    const day = utcDayKey(video.deadline);
    if (!day) {
      upcoming.push(video);
      continue;
    }
    if (day < today) {
      overdue.push(video);
    } else if (day === today) {
      dueToday.push(video);
    } else if (day === tomorrow) {
      dueTomorrow.push(video);
    } else {
      upcoming.push(video);
    }
  }

  const byPriorityThenDeadline = (a: SerializedVideo, b: SerializedVideo) => {
    if (Boolean(a.revisionPriority) !== Boolean(b.revisionPriority)) {
      return a.revisionPriority ? -1 : 1;
    }
    return String(a.deadline ?? "9999").localeCompare(String(b.deadline ?? "9999"));
  };

  overdue.sort(byPriorityThenDeadline);
  dueToday.sort(byPriorityThenDeadline);
  dueTomorrow.sort(byPriorityThenDeadline);
  upcoming.sort(byPriorityThenDeadline);
  completed.sort((a, b) => String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? "")));

  return { overdue, dueToday, dueTomorrow, completed, upcoming, today, tomorrow };
}

export function parseEditorBucket(value: unknown): EditorBucket | "" {
  if (value === "overdue" || value === "today" || value === "tomorrow" || value === "completed") {
    return value;
  }
  return "";
}
