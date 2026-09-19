import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));
const { connectDB } = vi.hoisted(() => ({ connectDB: vi.fn() }));
const payoutCreate = vi.hoisted(() => vi.fn());
const paymentAggregate = vi.hoisted(() => vi.fn());
const expenseAggregate = vi.hoisted(() => vi.fn());
const payoutAggregate = vi.hoisted(() => vi.fn());

vi.mock("@/lib/session", () => ({ getSession }));
vi.mock("@/lib/db", () => ({ connectDB }));
vi.mock("@/lib/activity", () => ({ logActivity: vi.fn() }));
vi.mock("@/models/CreatorPayout", () => ({
  CreatorPayout: {
    create: (...args: unknown[]) => payoutCreate(...args),
    find: vi.fn(),
    findById: vi.fn(),
    aggregate: (...args: unknown[]) => payoutAggregate(...args),
  },
}));
vi.mock("@/models/Creator", () => ({
  Creator: {
    findById: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: "cccccccccccccccccccccccc", rate: 4000 }),
    }),
  },
}));
vi.mock("@/models/Video", () => ({
  Video: {
    findById: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: "ffffffffffffffffffffffff",
        orderId: "dddddddddddddddddddddddd",
      }),
    }),
  },
}));
vi.mock("@/models/Order", () => ({
  Order: {
    findById: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: "dddddddddddddddddddddddd",
      }),
    }),
  },
}));
vi.mock("@/models/Payment", () => ({
  Payment: {
    aggregate: (...args: unknown[]) => paymentAggregate(...args),
  },
}));
vi.mock("@/models/Expense", () => ({
  Expense: {
    aggregate: (...args: unknown[]) => expenseAggregate(...args),
  },
}));

function ownerSession() {
  return {
    user: {
      id: "eeeeeeeeeeeeeeeeeeeeeeee",
      name: "Owner",
      email: "owner@leadyfy.local",
      role: "owner" as const,
      employeeSubRole: null,
      clientId: null,
    },
  };
}

describe("creator payout duplicate key", () => {
  beforeEach(() => {
    getSession.mockReset().mockResolvedValue(ownerSession());
    connectDB.mockResolvedValue(undefined);
    payoutCreate.mockReset();
  });

  it("surfaces a clear 409 when creatorId + videoId already exists", async () => {
    payoutCreate.mockRejectedValue({ code: 11000 });
    const { POST } = await import("@/app/api/payouts/route");
    const response = await POST(
      new Request("http://localhost/api/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creatorId: "cccccccccccccccccccccccc",
          orderId: "dddddddddddddddddddddddd",
          videoId: "ffffffffffffffffffffffff",
          videoCount: 1,
          contractedRate: 4000,
        }),
      }),
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringMatching(/already been paid/i),
    });
  });
});

describe("executive analytics aggregations", () => {
  beforeEach(() => {
    getSession.mockReset().mockResolvedValue(ownerSession());
    connectDB.mockResolvedValue(undefined);
    paymentAggregate.mockReset();
    expenseAggregate.mockReset();
    payoutAggregate.mockReset();
  });

  it("computes net profit from live aggregation totals", async () => {
    paymentAggregate
      .mockResolvedValueOnce([
        { revenue: 100000, totalReceivables: 25000, pendingInvoices: 2 },
      ])
      .mockResolvedValueOnce([{ _id: "2026-09", revenue: 100000 }]);
    expenseAggregate
      .mockResolvedValueOnce([{ expenses: 20000 }])
      .mockResolvedValueOnce([{ _id: "2026-09", expenses: 20000 }]);
    payoutAggregate.mockResolvedValueOnce([{ creatorPayouts: 15000 }]);

    const { loadExecutiveAnalytics } = await import("@/lib/analytics/hub");
    const analytics = await loadExecutiveAnalytics();

    expect(paymentAggregate).toHaveBeenCalled();
    expect(expenseAggregate).toHaveBeenCalled();
    expect(payoutAggregate).toHaveBeenCalled();
    expect(analytics.revenue).toBe(100000);
    expect(analytics.expenses).toBe(20000);
    expect(analytics.creatorPayouts).toBe(15000);
    expect(analytics.netProfit).toBe(65000);
    expect(analytics.totalReceivables).toBe(25000);
    expect(analytics.pendingInvoices).toBe(2);
    expect(analytics.monthly).toEqual([
      { month: "2026-09", revenue: 100000, expenses: 20000 },
    ]);
  });
});
