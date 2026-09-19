import { beforeEach, describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";

const OWN_CLIENT_ID = "aaaaaaaaaaaaaaaaaaaaaaaa";
const OTHER_CLIENT_ID = "bbbbbbbbbbbbbbbbbbbbbbbb";
const OTHER_SCRIPT_ID = "cccccccccccccccccccccccc";

const { getSession } = vi.hoisted(() => ({
  getSession: vi.fn(),
}));

const { connectDB } = vi.hoisted(() => ({
  connectDB: vi.fn(),
}));

function mockFind() {
  const query = {
    select: vi.fn(),
    populate: vi.fn(),
    sort: vi.fn(),
    lean: vi.fn(),
  };
  query.select.mockReturnValue(query);
  query.populate.mockReturnValue(query);
  query.sort.mockReturnValue(query);
  query.lean.mockResolvedValue([]);
  return query;
}

function mockFindById(doc: unknown) {
  const query = {
    select: vi.fn(),
    populate: vi.fn(),
    lean: vi.fn(),
  };
  query.select.mockReturnValue(query);
  query.populate.mockReturnValue(query);
  query.lean.mockResolvedValue(doc);
  return query;
}

const orderFind = vi.hoisted(() => vi.fn());
const scriptFind = vi.hoisted(() => vi.fn());
const scriptFindById = vi.hoisted(() => vi.fn());
const scriptFindByIdAndUpdate = vi.hoisted(() => vi.fn());
const videoFind = vi.hoisted(() => vi.fn());
const shootFind = vi.hoisted(() => vi.fn());
const paymentFind = vi.hoisted(() => vi.fn());
const paymentFindById = vi.hoisted(() => vi.fn());
const ticketFind = vi.hoisted(() => vi.fn());
const ticketFindById = vi.hoisted(() => vi.fn());

vi.mock("@/lib/session", () => ({ getSession }));
vi.mock("@/lib/db", () => ({ connectDB }));
vi.mock("@/models/Order", () => ({
  Order: {
    find: (...args: unknown[]) => orderFind(...args),
    findById: vi.fn(),
  },
}));
vi.mock("@/models/Script", () => ({
  Script: {
    find: (...args: unknown[]) => scriptFind(...args),
    findById: (...args: unknown[]) => scriptFindById(...args),
    findByIdAndUpdate: (...args: unknown[]) => scriptFindByIdAndUpdate(...args),
  },
}));
vi.mock("@/models/Video", () => ({
  Video: {
    find: (...args: unknown[]) => videoFind(...args),
    aggregate: vi.fn().mockResolvedValue([]),
  },
}));
vi.mock("@/models/Client", () => ({
  Client: { find: vi.fn(() => ({ select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }) })), findById: vi.fn(), create: vi.fn() },
}));
vi.mock("@/models/Shoot", () => ({
  Shoot: {
    find: (...args: unknown[]) => shootFind(...args),
    findById: vi.fn(),
    aggregate: vi.fn(),
    create: vi.fn(),
  },
}));
vi.mock("@/models/Payment", () => ({
  Payment: {
    find: (...args: unknown[]) => paymentFind(...args),
    findById: (...args: unknown[]) => paymentFindById(...args),
    create: vi.fn(),
  },
}));
vi.mock("@/models/SupportTicket", () => ({
  SupportTicket: {
    find: (...args: unknown[]) => ticketFind(...args),
    findById: (...args: unknown[]) => ticketFindById(...args),
    findByIdAndUpdate: vi.fn(),
    create: vi.fn(),
  },
}));
vi.mock("@/models/Employee", () => ({
  Employee: { find: vi.fn(), findById: vi.fn(), findOne: vi.fn() },
}));
vi.mock("@/models/Creator", () => ({
  Creator: { find: vi.fn(), findById: vi.fn() },
}));

function clientSession() {
  return {
    user: {
      id: "client-user-1",
      name: "Portal User",
      email: "client@example.com",
      role: "client" as const,
      employeeSubRole: null,
      clientId: OWN_CLIENT_ID,
    },
  };
}

describe("Client isolation", () => {
  beforeEach(() => {
    getSession.mockReset();
    connectDB.mockResolvedValue(undefined);
    orderFind.mockReset().mockReturnValue(mockFind());
    scriptFind.mockReset().mockReturnValue(mockFind());
    scriptFindById.mockReset().mockReturnValue(mockFindById(null));
    scriptFindByIdAndUpdate.mockReset().mockReturnValue(mockFindById(null));
    videoFind.mockReset().mockReturnValue(mockFind());
    shootFind.mockReset().mockReturnValue(mockFind());
    paymentFind.mockReset().mockReturnValue(mockFind());
    paymentFindById.mockReset().mockReturnValue(mockFindById(null));
    ticketFind.mockReset().mockReturnValue(mockFind());
    ticketFindById.mockReset().mockReturnValue(mockFindById(null));
    getSession.mockResolvedValue(clientSession());
  });

  it("cannot read another client's Order documents", async () => {
    const { GET } = await import("@/app/api/orders/route");
    const response = await GET(
      new Request(
        `http://localhost/api/orders?clientId=${OTHER_CLIENT_ID}`,
      ),
    );

    expect(response.status).toBe(200);
    expect(orderFind).toHaveBeenCalledTimes(1);
    const filter = orderFind.mock.calls[0][0] as { clientId: mongoose.Types.ObjectId };
    expect(String(filter.clientId)).toBe(OWN_CLIENT_ID);
    expect(String(filter.clientId)).not.toBe(OTHER_CLIENT_ID);
  });

  it("cannot read another client's Script documents", async () => {
    const { GET } = await import("@/app/api/scripts/route");
    const response = await GET(
      new Request(
        `http://localhost/api/scripts?clientId=${OTHER_CLIENT_ID}`,
      ),
    );

    expect(response.status).toBe(200);
    const filter = scriptFind.mock.calls[0][0] as { clientId: mongoose.Types.ObjectId };
    expect(String(filter.clientId)).toBe(OWN_CLIENT_ID);
  });

  it("cannot fetch another client's Script by id", async () => {
    scriptFindById.mockReturnValue(
      mockFindById({
        _id: OTHER_SCRIPT_ID,
        clientId: OTHER_CLIENT_ID,
        videoNumber: 1,
        status: "Sent to Client",
        comments: [],
      }),
    );

    const { GET } = await import("@/app/api/scripts/[id]/route");
    const response = await GET(new Request(`http://localhost/api/scripts/${OTHER_SCRIPT_ID}`), {
      params: Promise.resolve({ id: OTHER_SCRIPT_ID }),
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
  });

  it("cannot review another client's Script even with the id", async () => {
    scriptFindById.mockReturnValue(
      mockFindById({
        _id: OTHER_SCRIPT_ID,
        clientId: OTHER_CLIENT_ID,
        videoNumber: 1,
        status: "Sent to Client",
        comments: [],
      }),
    );

    const { PATCH } = await import("@/app/api/scripts/[id]/review/route");
    const response = await PATCH(
      new Request(`http://localhost/api/scripts/${OTHER_SCRIPT_ID}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      }),
      { params: Promise.resolve({ id: OTHER_SCRIPT_ID }) },
    );

    expect(response.status).toBe(403);
    expect(scriptFindByIdAndUpdate).not.toHaveBeenCalled();
  });

  it("cannot read another client's Video documents", async () => {
    const { GET } = await import("@/app/api/videos/route");
    const response = await GET(
      new Request(
        `http://localhost/api/videos?clientId=${OTHER_CLIENT_ID}`,
      ),
    );

    expect(response.status).toBe(200);
    const filter = videoFind.mock.calls[0][0] as { clientId: mongoose.Types.ObjectId };
    expect(String(filter.clientId)).toBe(OWN_CLIENT_ID);
  });

  it("cannot hit Owner-only system config routes", async () => {
    const { GET } = await import("@/app/api/users/route");
    const response = await GET();
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
  });

  it("cannot hit Admin employee directory routes", async () => {
    const { GET } = await import("@/app/api/employees/route");
    const response = await GET();
    expect(response.status).toBe(403);
  });

  it("cannot hit Owner/Admin payouts or expenses routes", async () => {
    const payouts = await import("@/app/api/payouts/route");
    const expenses = await import("@/app/api/expenses/route");
    expect((await payouts.GET()).status).toBe(403);
    expect((await expenses.GET()).status).toBe(403);
    const analytics = await import("@/app/api/analytics/route");
    expect((await analytics.GET()).status).toBe(403);
  });

  it("cannot list creators used for script assignment", async () => {
    const { GET } = await import("@/app/api/creators/route");
    const response = await GET();
    expect(response.status).toBe(403);
  });

  it("cannot read another client's Shoot documents", async () => {
    const { GET } = await import("@/app/api/shoots/route");
    const response = await GET(
      new Request(
        `http://localhost/api/shoots?clientId=${OTHER_CLIENT_ID}`,
      ),
    );

    expect(response.status).toBe(200);
    const filter = shootFind.mock.calls[0][0] as { clientId: mongoose.Types.ObjectId };
    expect(String(filter.clientId)).toBe(OWN_CLIENT_ID);
  });

  it("cannot assign creators to shoots", async () => {
    const { POST } = await import("@/app/api/shoots/route");
    const response = await POST(
      new Request("http://localhost/api/shoots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: OWN_CLIENT_ID,
          creatorId: OTHER_SCRIPT_ID,
          scheduledAt: "2026-09-20T10:00:00.000Z",
        }),
      }),
    );
    expect(response.status).toBe(403);
  });

  it("cannot hit internal Employee task routes", async () => {
    const { GET } = await import("@/app/api/tasks/route");
    const response = await GET(new Request("http://localhost/api/tasks"));
    expect(response.status).toBe(403);
  });

  it("cannot read another client's invoices", async () => {
    const { GET } = await import("@/app/api/payments/route");
    const response = await GET(
      new Request(`http://localhost/api/payments?clientId=${OTHER_CLIENT_ID}`),
    );

    expect(response.status).toBe(200);
    const filter = paymentFind.mock.calls[0][0] as { clientId: mongoose.Types.ObjectId };
    expect(String(filter.clientId)).toBe(OWN_CLIENT_ID);
  });

  it("cannot fetch another client's invoice by id", async () => {
    paymentFindById.mockReturnValue(
      mockFindById({
        _id: OTHER_SCRIPT_ID,
        clientId: OTHER_CLIENT_ID,
        invoiceAmount: 12000,
        amountReceived: 0,
        status: "Unpaid",
      }),
    );

    const { GET } = await import("@/app/api/payments/[id]/route");
    const response = await GET(
      new Request(`http://localhost/api/payments/${OTHER_SCRIPT_ID}`),
      { params: Promise.resolve({ id: OTHER_SCRIPT_ID }) },
    );

    expect(response.status).toBe(403);
  });

  it("cannot create invoices", async () => {
    const { POST } = await import("@/app/api/payments/route");
    const response = await POST(
      new Request("http://localhost/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: OWN_CLIENT_ID,
          invoiceAmount: 1000,
        }),
      }),
    );
    expect(response.status).toBe(403);
  });

  it("cannot read another client's support tickets", async () => {
    const { GET } = await import("@/app/api/tickets/route");
    const response = await GET(
      new Request(`http://localhost/api/tickets?clientId=${OTHER_CLIENT_ID}`),
    );

    expect(response.status).toBe(200);
    const filter = ticketFind.mock.calls[0][0] as { clientId: mongoose.Types.ObjectId };
    expect(String(filter.clientId)).toBe(OWN_CLIENT_ID);
  });

  it("cannot fetch another client's ticket by id", async () => {
    ticketFindById.mockReturnValue(
      mockFindById({
        _id: OTHER_SCRIPT_ID,
        clientId: OTHER_CLIENT_ID,
        subject: "Help",
        body: "Other client",
        status: "Open",
      }),
    );

    const { GET } = await import("@/app/api/tickets/[id]/route");
    const response = await GET(
      new Request(`http://localhost/api/tickets/${OTHER_SCRIPT_ID}`),
      { params: Promise.resolve({ id: OTHER_SCRIPT_ID }) },
    );

    expect(response.status).toBe(403);
  });
});
