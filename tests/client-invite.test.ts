import { beforeEach, describe, expect, it, vi } from "vitest";

const CLIENT_ID = "aaaaaaaaaaaaaaaaaaaaaaaa";
const USER_ID = "bbbbbbbbbbbbbbbbbbbbbbbb";
const TOKEN = "a".repeat(64);

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));
const { connectDB } = vi.hoisted(() => ({ connectDB: vi.fn() }));
const clientFindById = vi.hoisted(() => vi.fn());
const clientFindByIdAndUpdate = vi.hoisted(() => vi.fn());
const clientFindOne = vi.hoisted(() => vi.fn());
const clientFind = vi.hoisted(() => vi.fn());
const clientUpdateOne = vi.hoisted(() => vi.fn());
const userFindOne = vi.hoisted(() => vi.fn());
const userCreate = vi.hoisted(() => vi.fn());
const bcryptHash = vi.hoisted(() => vi.fn());
const bcryptCompare = vi.hoisted(() => vi.fn());

vi.mock("@/lib/session", () => ({ getSession }));
vi.mock("@/lib/db", () => ({ connectDB }));
vi.mock("@/lib/activity", () => ({ logActivity: vi.fn() }));
vi.mock("bcryptjs", () => ({
  default: {
    hash: (...args: unknown[]) => bcryptHash(...args),
    compare: (...args: unknown[]) => bcryptCompare(...args),
  },
}));
vi.mock("@/models/Client", () => ({
  Client: {
    findById: (...args: unknown[]) => clientFindById(...args),
    findByIdAndUpdate: (...args: unknown[]) => clientFindByIdAndUpdate(...args),
    findOne: (...args: unknown[]) => clientFindOne(...args),
    find: (...args: unknown[]) => clientFind(...args),
    updateOne: (...args: unknown[]) => clientUpdateOne(...args),
  },
}));
vi.mock("@/models/User", () => ({
  User: {
    findOne: (...args: unknown[]) => userFindOne(...args),
    create: (...args: unknown[]) => userCreate(...args),
  },
}));
vi.mock("@/models/Employee", () => ({
  Employee: {
    findOne: vi.fn(() => ({
      select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }),
    })),
    findById: vi.fn(() => ({
      select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }),
    })),
  },
}));

function leanQuery(doc: unknown) {
  return { select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(doc) }) };
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

function salesSession() {
  return {
    user: {
      id: USER_ID,
      name: "Sales",
      email: "sales@leadyfy.local",
      role: "employee" as const,
      employeeSubRole: "sales" as const,
      clientId: null,
    },
  };
}

describe("client portal invites", () => {
  beforeEach(() => {
    getSession.mockReset().mockResolvedValue(ownerSession());
    connectDB.mockResolvedValue(undefined);
    clientFindById.mockReset();
    clientFindByIdAndUpdate.mockReset().mockResolvedValue({});
    clientFindOne.mockReset();
    clientFind.mockReset().mockReturnValue({
      select: vi.fn().mockResolvedValue([]),
    });
    clientUpdateOne.mockReset().mockResolvedValue({ modifiedCount: 1 });
    userFindOne.mockReset().mockResolvedValue(null);
    userCreate.mockReset().mockResolvedValue({ _id: USER_ID });
    bcryptHash.mockReset().mockResolvedValue("hashed");
    bcryptCompare.mockReset().mockResolvedValue(true);
  });

  it("lets Owner generate a 7-day invite URL and stores the token", async () => {
    clientFindById.mockReturnValue(
      leanQuery({
        _id: CLIENT_ID,
        companyName: "Northstar UGC Studio",
        name: "Northstar",
        email: "portal.a@leadyfy.local",
        phone: "9999999999",
        whatsapp: "9999999999",
        passwordSet: false,
      }),
    );

    const { POST } = await import("@/app/api/clients/[id]/invite/route");
    const response = await POST(
      new Request("http://localhost:3000/api/clients/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "invite" }),
      }),
      { params: Promise.resolve({ id: CLIENT_ID }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.invite.inviteLink).toMatch(
      /^http:\/\/localhost:3000\/portal\/set-password\?token=[a-f0-9]{64}$/i,
    );
    expect(clientFindByIdAndUpdate).toHaveBeenCalledWith(
      CLIENT_ID,
      expect.objectContaining({
        $set: expect.objectContaining({
          inviteToken: expect.stringMatching(/^[a-f0-9]{64}$/i),
        }),
      }),
    );
  });

  it("blocks Employees from generating invite links", async () => {
    getSession.mockResolvedValue(salesSession());
    const { POST } = await import("@/app/api/clients/[id]/invite/route");
    const response = await POST(
      new Request("http://localhost:3000/api/clients/invite", {
        method: "POST",
        body: JSON.stringify({ kind: "invite" }),
      }),
      { params: Promise.resolve({ id: CLIENT_ID }) },
    );
    expect(response.status).toBe(403);
  });

  it("rejects login when passwordSet is false", async () => {
    clientFind.mockReturnValue({
      select: vi.fn().mockResolvedValue([
        {
          _id: CLIENT_ID,
          email: "portal.a@leadyfy.local",
          name: "Northstar",
          passwordSet: false,
          passwordHash: null,
        },
      ]),
    });

    const { POST } = await import("@/app/api/portal/login-check/route");
    const response = await POST(
      new Request("http://localhost/api/portal/login-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "portal.a@leadyfy.local",
          password: "whatever1",
        }),
      }),
    );
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: "Ask the agency for your client name and password",
    });
  });

  it("sets password from a valid token and clears the invite", async () => {
    clientFindOne.mockReturnValue({
      select: vi.fn().mockResolvedValue({
        _id: CLIENT_ID,
        email: "portal.a@leadyfy.local",
        name: "Northstar",
        companyName: "Northstar UGC Studio",
        inviteToken: TOKEN,
        inviteTokenExpiry: new Date(Date.now() + 60_000),
        passwordSet: false,
        passwordHash: null,
      }),
    });

    const { POST } = await import("@/app/api/portal/set-password/route");
    const response = await POST(
      new Request("http://localhost/api/portal/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: TOKEN,
          password: "Client@123",
          confirmPassword: "Client@123",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(clientUpdateOne).toHaveBeenCalledWith(
      { _id: CLIENT_ID },
      expect.objectContaining({
        $set: expect.objectContaining({
          passwordSet: true,
          passwordHash: "hashed",
          passwordCipher: expect.stringMatching(/^v1:/),
        }),
        $unset: { inviteToken: 1, inviteTokenExpiry: 1 },
      }),
    );
    expect(userCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "portal.a@leadyfy.local",
        role: "client",
        clientId: CLIENT_ID,
      }),
    );
  });

  it("rejects expired tokens", async () => {
    clientFindOne.mockReturnValue({
      select: vi.fn().mockResolvedValue({
        _id: CLIENT_ID,
        inviteToken: TOKEN,
        inviteTokenExpiry: new Date(Date.now() - 1000),
      }),
    });

    const { POST } = await import("@/app/api/portal/set-password/route");
    const response = await POST(
      new Request("http://localhost/api/portal/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: TOKEN,
          password: "Client@123",
          confirmPassword: "Client@123",
        }),
      }),
    );
    expect(response.status).toBe(400);
  });
});
