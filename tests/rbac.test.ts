import { describe, expect, it } from "vitest";
import { canAccess, scopedQuery, type AuthSessionUser } from "@/lib/rbac";
import mongoose from "mongoose";

const OWN = "aaaaaaaaaaaaaaaaaaaaaaaa";
const OTHER = "bbbbbbbbbbbbbbbbbbbbbbbb";

function user(
  overrides: Partial<AuthSessionUser> & Pick<AuthSessionUser, "role">,
): AuthSessionUser {
  return {
    id: "user-1",
    name: "Test",
    email: "test@example.com",
    employeeSubRole: null,
    clientId: null,
    employeeId: null,
    permissions: [],
    allowedClientIds: null,
    ...overrides,
  };
}

describe("canAccess", () => {
  it("lets Owner use system config and every operational module", () => {
    const owner = user({ role: "owner" });
    expect(canAccess(owner, "users", "write")).toBe(true);
    expect(canAccess(owner, "payouts", "write")).toBe(true);
    expect(canAccess(owner, "employees", "write")).toBe(true);
  });

  it("blocks Admin from system config users routes", () => {
    const admin = user({ role: "admin" });
    expect(canAccess(admin, "users", "read")).toBe(false);
    expect(canAccess(admin, "users", "write")).toBe(false);
    expect(canAccess(admin, "orders", "write")).toBe(true);
    expect(canAccess(admin, "analytics", "read")).toBe(true);
    expect(canAccess(admin, "employees", "read")).toBe(true);
    expect(canAccess(admin, "employees", "write")).toBe(false);
  });

  it("honors a non-empty admin permissions list", () => {
    const admin = user({
      role: "admin",
      permissions: ["clients.read", "reports.read"],
    });
    expect(canAccess(admin, "clients", "read")).toBe(true);
    expect(canAccess(admin, "clients", "write")).toBe(false);
    expect(canAccess(admin, "analytics", "read")).toBe(true);
    expect(canAccess(admin, "payouts", "read")).toBe(false);
    expect(canAccess(admin, "users", "read")).toBe(false);
  });

  it("limits Employees to their sub-role", () => {
    const sales = user({ role: "employee", employeeSubRole: "sales" });
    const editor = user({ role: "employee", employeeSubRole: "editor" });
    const writer = user({ role: "employee", employeeSubRole: "script_writer" });

    expect(canAccess(sales, "clients", "write")).toBe(true);
    expect(canAccess(sales, "tasks", "write")).toBe(true);
    expect(canAccess(sales, "videos", "write")).toBe(false);
    expect(canAccess(editor, "videos", "write")).toBe(true);
    expect(canAccess(editor, "tasks", "write")).toBe(true);
    expect(canAccess(editor, "orders", "write")).toBe(false);
    expect(canAccess(editor, "analytics", "read")).toBe(false);
    expect(canAccess(writer, "scripts", "write")).toBe(true);
    expect(canAccess(writer, "shoots", "write")).toBe(false);
    expect(canAccess(writer, "creators", "read")).toBe(false);

    const shootManager = user({
      role: "employee",
      employeeSubRole: "shoot_manager",
    });
    expect(canAccess(shootManager, "creators", "write")).toBe(true);
    expect(canAccess(shootManager, "shoots", "write")).toBe(true);
  });

  it("lets Clients read only client-scoped modules", () => {
    const client = user({ role: "client", clientId: OWN });
    expect(canAccess(client, "orders", "read")).toBe(true);
    expect(canAccess(client, "scripts", "read")).toBe(true);
    expect(canAccess(client, "videos", "read")).toBe(true);
    expect(canAccess(client, "payments", "read")).toBe(true);
    expect(canAccess(client, "notifications", "read")).toBe(true);
    expect(canAccess(client, "payments", "write")).toBe(false);
    expect(canAccess(client, "tickets", "write")).toBe(true);
    expect(canAccess(client, "orders", "write")).toBe(false);
    expect(canAccess(client, "scripts", "write")).toBe(false);
    expect(canAccess(client, "employees", "read")).toBe(false);
    expect(canAccess(client, "users", "read")).toBe(false);
    expect(canAccess(client, "payouts", "read")).toBe(false);
    expect(canAccess(client, "analytics", "read")).toBe(false);
    expect(canAccess(client, "creators", "read")).toBe(false);
    expect(canAccess(client, "tasks", "read")).toBe(false);
    expect(canAccess(client, "shoots", "write")).toBe(false);
  });

  it("rejects Client sessions that have no clientId", () => {
    const client = user({ role: "client", clientId: null });
    expect(canAccess(client, "orders", "read")).toBe(false);
  });
});

describe("scopedQuery", () => {
  it("forces clientId from the session and ignores another client's id", () => {
    const client = user({ role: "client", clientId: OWN });
    const filter = scopedQuery(client, {
      clientId: new mongoose.Types.ObjectId(OTHER),
    });

    expect(String(filter.clientId)).toBe(OWN);
  });

  it("does not inject clientId for staff sessions", () => {
    const admin = user({ role: "admin" });
    expect(scopedQuery(admin, { status: "New" })).toEqual({ status: "New" });
  });

  it("scopes employees to assigned client ids", () => {
    const sales = user({
      role: "employee",
      employeeSubRole: "sales",
      employeeId: "eeeeeeeeeeeeeeeeeeeeeeee",
      allowedClientIds: [OWN],
    });
    const filter = scopedQuery(sales, {
      clientId: new mongoose.Types.ObjectId(OTHER),
    });
    const ids = (filter.clientId as { $in: mongoose.Types.ObjectId[] }).$in;
    expect(ids.map(String)).toEqual([OWN]);
  });
});
