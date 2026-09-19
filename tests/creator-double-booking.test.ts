import { beforeEach, describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";

const CLIENT_ID = "aaaaaaaaaaaaaaaaaaaaaaaa";
const CREATOR_ID = "cccccccccccccccccccccccc";
const SHOOT_ID = "dddddddddddddddddddddddd";
const USER_ID = "eeeeeeeeeeeeeeeeeeeeeeee";

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
vi.mock("@/models/CreatorAvailability", () => ({
  CreatorAvailability: {
    find: vi.fn(() => ({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      }),
    })),
  },
}));

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

function shootPayload() {
  return {
    clientId: CLIENT_ID,
    creatorId: CREATOR_ID,
    location: "Studio A",
    scheduledAt: "2026-09-20T10:00:00.000Z",
    endsAt: "2026-09-20T12:00:00.000Z",
    status: "Scheduled",
    notes: "",
  };
}

describe("Creator double-booking guard", () => {
  beforeEach(() => {
    getSession.mockReset().mockResolvedValue(ownerSession());
    connectDB.mockResolvedValue(undefined);
    shootFind.mockReset().mockReturnValue({
      select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
    });
    shootCreate.mockReset().mockResolvedValue({ _id: SHOOT_ID });
    shootFindById.mockReset().mockReturnValue(
      mockFindById({
        _id: SHOOT_ID,
        clientId: CLIENT_ID,
        creatorId: CREATOR_ID,
        location: "Studio A",
        scheduledAt: new Date("2026-09-20T10:00:00.000Z"),
        endsAt: new Date("2026-09-20T12:00:00.000Z"),
        status: "Scheduled",
        notes: "",
      }),
    );
    shootFindByIdAndUpdate.mockReset().mockReturnValue(
      mockFindById({
        _id: SHOOT_ID,
        clientId: CLIENT_ID,
        creatorId: CREATOR_ID,
        location: "Studio A",
        scheduledAt: new Date("2026-09-20T10:00:00.000Z"),
        endsAt: new Date("2026-09-20T12:00:00.000Z"),
        status: "Scheduled",
        notes: "",
      }),
    );
    clientFindById.mockReset().mockReturnValue(mockLean({ _id: CLIENT_ID }));
    creatorFindById.mockReset().mockReturnValue(mockLean({ _id: CREATOR_ID }));
    orderFindById.mockReset().mockReturnValue(mockLean(null));
  });

  it("blocks assigning a creator to an overlapping shoot window", async () => {
    shootFind.mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          {
            _id: new mongoose.Types.ObjectId(),
            creatorId: CREATOR_ID,
            scheduledAt: new Date("2026-09-20T11:00:00.000Z"),
            endsAt: new Date("2026-09-20T13:00:00.000Z"),
          },
        ]),
      }),
    });

    const { POST } = await import("@/app/api/shoots/route");
    const response = await POST(
      new Request("http://localhost/api/shoots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(shootPayload()),
      }),
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "Creator is already booked for an overlapping shoot",
    });
    expect(shootCreate).not.toHaveBeenCalled();
    expect(shootFind).toHaveBeenCalled();
    const filter = shootFind.mock.calls[0][0] as { creatorId: mongoose.Types.ObjectId };
    expect(String(filter.creatorId)).toBe(CREATOR_ID);
  });

  it("allows a non-overlapping assignment for the same creator", async () => {
    const { POST } = await import("@/app/api/shoots/route");
    const response = await POST(
      new Request("http://localhost/api/shoots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(shootPayload()),
      }),
    );

    expect(response.status).toBe(201);
    expect(shootCreate).toHaveBeenCalledTimes(1);
  });

  it("blocks PATCH assignment when another shoot overlaps", async () => {
    shootFindById.mockReturnValue(
      mockFindById({
        _id: SHOOT_ID,
        clientId: CLIENT_ID,
        creatorId: null,
        location: "Studio A",
        scheduledAt: new Date("2026-09-20T10:00:00.000Z"),
        endsAt: new Date("2026-09-20T12:00:00.000Z"),
        status: "Scheduled",
        notes: "",
      }),
    );
    shootFind.mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([{ _id: "other-shoot", scheduledAt: new Date("2026-09-20T11:00:00.000Z"), endsAt: new Date("2026-09-20T13:00:00.000Z") }]),
      }),
    });

    const { PATCH } = await import("@/app/api/shoots/[id]/route");
    const response = await PATCH(
      new Request(`http://localhost/api/shoots/${SHOOT_ID}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creatorId: CREATOR_ID }),
      }),
      { params: Promise.resolve({ id: SHOOT_ID }) },
    );

    expect(response.status).toBe(409);
    expect(shootFindByIdAndUpdate).not.toHaveBeenCalled();
  });

  it("requires a start time before assigning a creator", async () => {
    const { POST } = await import("@/app/api/shoots/route");
    const response = await POST(
      new Request("http://localhost/api/shoots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: CLIENT_ID,
          creatorId: CREATOR_ID,
          location: "Studio A",
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(shootCreate).not.toHaveBeenCalled();
  });
});

describe("resolveShootWindow", () => {
  it("defaults a missing end to two hours after start", async () => {
    const { resolveShootWindow, DEFAULT_SHOOT_DURATION_MS } = await import(
      "@/lib/shoots/overlap"
    );
    const start = new Date("2026-09-20T10:00:00.000Z");
    const window = resolveShootWindow(start, null);
    expect(window.end.getTime() - window.start.getTime()).toBe(
      DEFAULT_SHOOT_DURATION_MS,
    );
  });
});
