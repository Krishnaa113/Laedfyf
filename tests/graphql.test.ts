import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  loadDashboardHub: vi.fn(),
  loadClientList: vi.fn(),
}));

vi.mock("@/lib/rbac", () => ({
  requireAccess: mocks.requireAccess,
  canAccess: vi.fn(() => false),
}));

vi.mock("@/lib/dashboard/hub", () => ({
  loadDashboardHub: mocks.loadDashboardHub,
}));

vi.mock("@/lib/clients/hub", () => ({
  loadClientList: mocks.loadClientList,
  loadClientHub: vi.fn(),
}));

vi.mock("@/lib/orders/hub", () => ({
  loadOrderList: vi.fn(),
  loadOrderHub: vi.fn(),
}));

vi.mock("@/lib/scripts/hub", () => ({
  loadScriptList: vi.fn(),
  loadScriptHub: vi.fn(),
}));

vi.mock("@/lib/creators/hub", () => ({
  loadCreatorList: vi.fn(),
  loadCreatorHub: vi.fn(),
}));

vi.mock("@/lib/shoots/hub", () => ({
  loadShootList: vi.fn(),
  loadShootHub: vi.fn(),
}));

vi.mock("@/lib/videos/hub", () => ({
  loadVideoList: vi.fn(),
  loadVideoHub: vi.fn(),
}));

vi.mock("@/lib/tasks/hub", () => ({
  loadTaskList: vi.fn(),
}));

vi.mock("@/lib/payments/hub", () => ({
  loadPaymentList: vi.fn(),
}));

vi.mock("@/lib/expenses/hub", () => ({
  loadExpenseList: vi.fn(),
}));

vi.mock("@/lib/payouts/hub", () => ({
  loadPayoutList: vi.fn(),
}));

vi.mock("@/lib/tickets/hub", () => ({
  loadTicketList: vi.fn(),
}));

vi.mock("@/lib/employees/hub", () => ({
  loadEmployeeList: vi.fn(),
}));

vi.mock("@/lib/users/hub", () => ({
  loadUserList: vi.fn(),
}));

import { executeGraphql, graphqlSchema } from "@/lib/graphql/execute";

describe("GraphQL API", () => {
  beforeEach(() => {
    mocks.requireAccess.mockReset();
    mocks.loadDashboardHub.mockReset();
    mocks.loadClientList.mockReset();
  });

  it("exposes the operational query fields", () => {
    const fields = graphqlSchema.getQueryType()?.getFields() ?? {};
    expect(Object.keys(fields)).toEqual(
      expect.arrayContaining([
        "me",
        "dashboard",
        "clients",
        "orders",
        "scripts",
        "videos",
        "tasks",
        "payments",
        "payouts",
      ]),
    );
  });

  it("returns me for a signed-in owner", async () => {
    mocks.requireAccess.mockResolvedValue({
      ok: true,
      session: {
        user: {
          id: "owner-1",
          name: "Owner",
          email: "owner@leadyfy.local",
          role: "owner",
          employeeSubRole: null,
          clientId: null,
          employeeId: null,
          permissions: [],
        },
      },
    });

    const result = await executeGraphql({
      query: "{ me { email role } }",
    });

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      me: { email: "owner@leadyfy.local", role: "owner" },
    });
  });

  it("loads dashboard widgets through the same hub as the page", async () => {
    mocks.requireAccess.mockResolvedValue({
      ok: true,
      session: { user: { id: "owner-1", role: "owner", permissions: [] } },
    });
    mocks.loadDashboardHub.mockResolvedValue({
      newClientsOnboarded: 2,
      pendingScripts: 4,
      pendingApprovals: 3,
      urgentTasks: 1,
      overdueTasks: 0,
    });

    const result = await executeGraphql({
      query:
        "{ dashboard { newClientsOnboarded pendingScripts pendingApprovals urgentTasks overdueTasks } }",
    });

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      dashboard: {
        newClientsOnboarded: 2,
        pendingScripts: 4,
        pendingApprovals: 3,
        urgentTasks: 1,
        overdueTasks: 0,
      },
    });
  });

  it("blocks clients list when RBAC denies the module", async () => {
    mocks.requireAccess.mockResolvedValue({
      ok: false,
      response: { status: 403 },
    });

    const result = await executeGraphql({
      query: "{ clients { id } }",
    });

    expect(result.errors?.[0]?.message).toBe("Not allowed");
  });
});
