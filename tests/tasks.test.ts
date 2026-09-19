import { beforeEach, describe, expect, it, vi } from "vitest";

const USER_ID = "aaaaaaaaaaaaaaaaaaaaaaaa";
const ASSIGNEE_ID = "bbbbbbbbbbbbbbbbbbbbbbbb";
const ORDER_ID = "cccccccccccccccccccccccc";
const CLIENT_ID = "dddddddddddddddddddddddd";
const TASK_ID = "eeeeeeeeeeeeeeeeeeeeeeee";

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));
const { connectDB } = vi.hoisted(() => ({ connectDB: vi.fn() }));
const taskFind = vi.hoisted(() => vi.fn());
const taskFindById = vi.hoisted(() => vi.fn());
const taskCreate = vi.hoisted(() => vi.fn());
const userFind = vi.hoisted(() => vi.fn());
const orderFindById = vi.hoisted(() => vi.fn());

vi.mock("@/lib/session", () => ({ getSession }));
vi.mock("@/lib/db", () => ({ connectDB }));
vi.mock("@/lib/activity", () => ({ logActivity: vi.fn() }));
vi.mock("@/models/Task", () => ({
  Task: {
    find: (...args: unknown[]) => taskFind(...args),
    findById: (...args: unknown[]) => taskFindById(...args),
    create: (...args: unknown[]) => taskCreate(...args),
  },
}));
vi.mock("@/models/User", () => ({
  User: {
    find: (...args: unknown[]) => userFind(...args),
  },
}));
vi.mock("@/models/Order", () => ({
  Order: {
    findById: (...args: unknown[]) => orderFindById(...args),
  },
}));
vi.mock("@/models/Client", () => ({
  Client: { findById: vi.fn() },
}));
vi.mock("@/models/Script", () => ({
  Script: { findById: vi.fn() },
}));
vi.mock("@/models/Video", () => ({
  Video: { findById: vi.fn() },
}));

function chainQuery<T>(value: T) {
  const query = {
    populate: vi.fn(),
    select: vi.fn(),
    sort: vi.fn(),
    lean: vi.fn(),
  };
  query.populate.mockReturnValue(query);
  query.select.mockReturnValue(query);
  query.sort.mockReturnValue(query);
  query.lean.mockResolvedValue(value);
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

describe("task validators", () => {
  it("stores Med as Medium and defaults status to To Do", async () => {
    const { taskInputSchema } = await import("@/lib/validators/task");
    const parsed = taskInputSchema.parse({
      title: "Prep shoot brief",
      priority: "Med",
    });
    expect(parsed.priority).toBe("Medium");
    expect(parsed.status).toBe("To Do");
  });

  it("requires related type and id together", async () => {
    const { taskInputSchema } = await import("@/lib/validators/task");
    const result = taskInputSchema.safeParse({
      title: "Follow up",
      relatedType: "Order",
    });
    expect(result.success).toBe(false);
  });
});

describe("task serialization", () => {
  it("exposes relatedTo type/id plus a document href", async () => {
    const { serializeTask } = await import("@/lib/serialize");
    const serialized = serializeTask({
      _id: TASK_ID,
      title: "Edit cut",
      assigneeId: { _id: ASSIGNEE_ID, name: "Asha Editor" },
      relatedTo: {
        type: "Order",
        id: { _id: ORDER_ID, packageName: "Starter 8" },
      },
      priority: "High",
      status: "In Progress",
      deadline: "2026-09-22T00:00:00.000Z",
      attachments: ["/uploads/tasks/brief.pdf"],
    });

    expect(serialized?.relatedTo).toEqual({ type: "Order", id: ORDER_ID });
    expect(serialized?.relatedLabel).toBe("Starter 8");
    expect(serialized?.relatedHref).toBe(`/orders/${ORDER_ID}`);
    expect(serialized?.assigneeName).toBe("Asha Editor");
    expect(serialized?.attachments).toEqual(["/uploads/tasks/brief.pdf"]);
  });
});

describe("task API", () => {
  beforeEach(() => {
    getSession.mockReset().mockResolvedValue(ownerSession());
    connectDB.mockResolvedValue(undefined);
    taskFind.mockReset();
    taskFindById.mockReset();
    taskCreate.mockReset();
    userFind.mockReset();
    orderFindById.mockReset();
  });

  it("creates a task with assignee, priority, deadline, and relatedTo", async () => {
    orderFindById.mockReturnValue(
      chainQuery({ _id: ORDER_ID, clientId: CLIENT_ID, packageName: "Starter 8" }),
    );
    taskCreate.mockResolvedValue({ _id: TASK_ID });
    taskFindById.mockReturnValue(
      chainQuery({
        _id: TASK_ID,
        title: "QA Starter 8 cut",
        description: "",
        assigneeId: { _id: ASSIGNEE_ID, name: "Asha Editor" },
        createdById: { _id: USER_ID, name: "Owner" },
        clientId: CLIENT_ID,
        relatedTo: {
          type: "Order",
          id: { _id: ORDER_ID, packageName: "Starter 8" },
        },
        priority: "Urgent",
        status: "To Do",
        deadline: "2026-09-25T00:00:00.000Z",
        attachments: ["/uploads/tasks/notes.pdf"],
      }),
    );

    const { POST } = await import("@/app/api/tasks/route");
    const response = await POST(
      new Request("http://localhost/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "QA Starter 8 cut",
          assigneeId: ASSIGNEE_ID,
          relatedType: "Order",
          relatedId: ORDER_ID,
          priority: "Urgent",
          deadline: "2026-09-25",
          attachments: ["/uploads/tasks/notes.pdf"],
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(taskCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "QA Starter 8 cut",
        assigneeId: ASSIGNEE_ID,
        clientId: CLIENT_ID,
        relatedTo: { type: "Order", id: ORDER_ID },
        priority: "Urgent",
        status: "To Do",
        attachments: ["/uploads/tasks/notes.pdf"],
      }),
    );
    const body = await response.json();
    expect(body.task.relatedTo).toEqual({ type: "Order", id: ORDER_ID });
    expect(body.task.priority).toBe("Urgent");
  });
});
