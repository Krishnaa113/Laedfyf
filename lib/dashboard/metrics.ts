import type { ScriptStatus, VideoStatus } from "@/lib/status";

export const PENDING_SCRIPT_STATUSES: ScriptStatus[] = [
  "Draft",
  "Assigned",
  "In Review",
  "Sent to Client",
  "Revision Required",
];

export const PENDING_SCRIPT_APPROVAL_STATUSES: ScriptStatus[] = ["Sent to Client"];

export const VIDEO_PENDING_APPROVAL_STATUSES: VideoStatus[] = [
  "Internal QA",
  "Client Review",
];

export const VIDEO_REVISION_STATUSES: VideoStatus[] = ["Revision"];

export const VIDEO_DELIVERED_STATUSES: VideoStatus[] = ["Delivered"];

export const OPEN_TASK_STATUSES = ["To Do", "In Progress"] as const;

export function startOfMonth(now: Date) {
  return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
}

export function dayBounds(now: Date) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function isOpenTaskStatus(status: string) {
  return OPEN_TASK_STATUSES.includes(status as (typeof OPEN_TASK_STATUSES)[number]);
}
