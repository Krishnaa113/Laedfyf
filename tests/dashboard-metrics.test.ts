import { describe, expect, it } from "vitest";
import {
  dayBounds,
  isOpenTaskStatus,
  PENDING_SCRIPT_APPROVAL_STATUSES,
  PENDING_SCRIPT_STATUSES,
  startOfMonth,
  VIDEO_PENDING_APPROVAL_STATUSES,
} from "@/lib/dashboard/metrics";

describe("dashboard metrics", () => {
  it("starts the month on day 1 of the current month", () => {
    const start = startOfMonth(new Date(2026, 8, 19, 15, 30));
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(8);
    expect(start.getDate()).toBe(1);
    expect(start.getHours()).toBe(0);
  });

  it("bounds today from midnight to end of day", () => {
    const { start, end } = dayBounds(new Date(2026, 8, 19, 15, 30));
    expect(start.getHours()).toBe(0);
    expect(end.getHours()).toBe(23);
    expect(end.getDate()).toBe(19);
  });

  it("treats draft through revision as pending scripts", () => {
    expect(PENDING_SCRIPT_STATUSES).toContain("Draft");
    expect(PENDING_SCRIPT_STATUSES).toContain("Sent to Client");
    expect(PENDING_SCRIPT_STATUSES).not.toContain("Approved");
    expect(PENDING_SCRIPT_APPROVAL_STATUSES).toEqual(["Sent to Client"]);
  });

  it("treats internal QA and client review as pending video approval", () => {
    expect(VIDEO_PENDING_APPROVAL_STATUSES).toEqual(["Internal QA", "Client Review"]);
  });

  it("treats only open tasks as urgent or overdue", () => {
    expect(isOpenTaskStatus("To Do")).toBe(true);
    expect(isOpenTaskStatus("In Progress")).toBe(true);
    expect(isOpenTaskStatus("Done")).toBe(false);
  });
});
