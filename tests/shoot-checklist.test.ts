import { beforeEach, describe, expect, it, vi } from "vitest";

const CLIENT_ID = "aaaaaaaaaaaaaaaaaaaaaaaa";
const SHOOT_ID = "dddddddddddddddddddddddd";
const USER_ID = "eeeeeeeeeeeeeeeeeeeeeeee";

const COMPLETE_CHECKLIST = {
  scriptApproved: true,
  creatorConfirmed: true,
  locationPermission: true,
  clientProductReceived: true,
  teamBriefed: true,
};

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));
const { connectDB } = vi.hoisted(() => ({ connectDB: vi.fn() }));
const shootFind = vi.hoisted(() => vi.fn());
const shootCreate = vi.hoisted(() => vi.fn());
const shootFindById = vi.hoisted(() => vi.fn());
const shootFindByIdAndUpdate = vi.hoisted(() => vi.fn());
const clientFindById = vi.hoisted(() => vi.fn());
const creatorFindById = vi.hoisted(() => vi.fn());
const orderFindById = vi.hoisted(() => vi.fn());

vi.mock("@/lib/session", () => ({ getSession }));
vi.mock("@/lib/db", () => ({ connectDB }));
vi.mock("@/lib/activity", () => ({ logActivity: vi.fn() }));
vi.mock("@/models/Shoot", () => ({
  Shoot: {
    find: (...args: unknown[]) => shootFind(...args),
    create: (...args: unknown[]) => shootCreate(...args),
    findById: (...args: unknown[]) => shootFindById(...args),
    findByIdAndUpdate: (...args: unknown[]) => shootFindByIdAndUpdate(...args),
  },
}));
vi.mock("@/models/Client", () => ({
  Client: { findById: (...args: unknown[]) => clientFindById(...args) },
}));
vi.mock("@/models/Creator", () => ({
  Creator: { findById: (...args: unknown[]) => creatorFindById(...args) },
}));
vi.mock("@/models/Order", () => ({
  Order: { findById: (...args: unknown[]) => orderFindById(...args) },
}));
vi.mock("@/models/Employee", () => ({
  Employee: { findById: vi.fn() },
}));
vi.mock("@/models/Script", () => ({
  Script: { find: vi.fn() },
}));
vi.mock("@/models/User", () => ({ User: {} }));

function mockLean(doc: unknown) {
  return { lean: vi.fn().mockResolvedValue(doc) };
}

function mockFindById(doc: unknown) {
  const query = {
    populate: vi.fn(),
    lean: vi.fn(),
  };
  query.populate.mockReturnValue(query);
  query.lean.mockResolvedValue(doc);
  return query;
}

function ownerSession() {
  return {
    user: {
      id: USER_ID,
      name: "Owner",
      email: "owner@leadyfy.local",
      role: "owner" as const,
      employeeSubRole: null,
      clientId: null,
    },
  };
}

function scheduledShoot(overrides: Record<string, unknown> = {}) {
  return {
    _id: SHOOT_ID,
    clientId: CLIENT_ID,
    creatorId: null,
    location: "Studio A",
    scheduledAt: new Date("2026-09-20T10:00:00.000Z"),
    endsAt: new Date("2026-09-20T12:00:00.000Z"),
    status: "Scheduled",
    notes: "",
    checklist: {
      scriptApproved: false,
      creatorConfirmed: false,
      locationPermission: false,
      clientProductReceived: false,
      teamBriefed: false,
    },
    approvedScriptIds: [],
    ...overrides,
  };
}

describe("Pre-shoot checklist In Progress guard", () => {
  beforeEach(() => {
    getSession.mockReset().mockResolvedValue(ownerSession());
    connectDB.mockResolvedValue(undefined);
    shootFind.mockReset().mockReturnValue({
      select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
    });
    shootCreate.mockReset().mockResolvedValue({ _id: SHOOT_ID });
    shootFindById.mockReset().mockReturnValue(mockFindById(scheduledShoot()));
    shootFindByIdAndUpdate.mockReset().mockReturnValue(
      mockFindById(scheduledShoot({ status: "In Progress", checklist: COMPLETE_CHECKLIST })),
    );
    clientFindById.mockReset().mockReturnValue(mockLean({ _id: CLIENT_ID }));
    creatorFindById.mockReset().mockReturnValue(mockLean(null));
    orderFindById.mockReset().mockReturnValue(mockLean(null));
  });

  it("blocks POST In Progress when the checklist is incomplete", async () => {
    const { POST } = await import("@/app/api/shoots/route");
    const response = await POST(
      new Request("http://localhost/api/shoots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: CLIENT_ID,
          location: "Studio A",
          status: "In Progress",
        }),
      }),
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(String(body.error)).toContain("Complete the pre-shoot checklist");
    expect(shootCreate).not.toHaveBeenCalled();
  });

  it("allows POST In Progress when every checklist item is true", async () => {
    const { POST } = await import("@/app/api/shoots/route");
    const response = await POST(
      new Request("http://localhost/api/shoots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: CLIENT_ID,
          location: "Studio A",
          status: "In Progress",
          checklist: COMPLETE_CHECKLIST,
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(shootCreate).toHaveBeenCalledTimes(1);
    const created = shootCreate.mock.calls[0][0] as { checklist: typeof COMPLETE_CHECKLIST };
    expect(created.checklist).toEqual(COMPLETE_CHECKLIST);
  });

  it("blocks PATCH into In Progress until the checklist is complete", async () => {
    const { PATCH } = await import("@/app/api/shoots/[id]/route");
    const response = await PATCH(
      new Request(`http://localhost/api/shoots/${SHOOT_ID}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "In Progress" }),
      }),
      { params: Promise.resolve({ id: SHOOT_ID }) },
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(String(body.error)).toContain("Complete the pre-shoot checklist");
    expect(shootFindByIdAndUpdate).not.toHaveBeenCalled();
  });

  it("allows PATCH In Progress when the same request completes the checklist", async () => {
    const { PATCH } = await import("@/app/api/shoots/[id]/route");
    const response = await PATCH(
      new Request(`http://localhost/api/shoots/${SHOOT_ID}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "In Progress",
          checklist: COMPLETE_CHECKLIST,
        }),
      }),
      { params: Promise.resolve({ id: SHOOT_ID }) },
    );

    expect(response.status).toBe(200);
    expect(shootFindByIdAndUpdate).toHaveBeenCalledTimes(1);
  });

  it("still allows Confirmed without a complete checklist", async () => {
    const { PATCH } = await import("@/app/api/shoots/[id]/route");
    shootFindByIdAndUpdate.mockReturnValue(
      mockFindById(scheduledShoot({ status: "Confirmed" })),
    );
    const response = await PATCH(
      new Request(`http://localhost/api/shoots/${SHOOT_ID}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Confirmed" }),
      }),
      { params: Promise.resolve({ id: SHOOT_ID }) },
    );

    expect(response.status).toBe(200);
    expect(shootFindByIdAndUpdate).toHaveBeenCalled();
  });
});

describe("shoot calendar range", () => {
  it("pads a month grid from Monday through the following Sunday", async () => {
    const { calendarRange, startOfUtcWeek } = await import("@/lib/shoots/calendar");
    const range = calendarRange("month", "2026-09-18");
    expect(range.from).toBe("2026-08-31T00:00:00.000Z");
    expect(startOfUtcWeek("2026-09-01")).toBe("2026-08-31");
    expect(range.to).toBe("2026-10-05T00:00:00.000Z");
  });
});
