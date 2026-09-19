import { beforeEach, describe, expect, it, vi } from "vitest";

const USER_ID = "aaaaaaaaaaaaaaaaaaaaaaaa";
const OTHER_USER_ID = "bbbbbbbbbbbbbbbbbbbbbbbb";
const PAYMENT_ID = "cccccccccccccccccccccccc";
const CLIENT_ID = "dddddddddddddddddddddddd";

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));
const { connectDB } = vi.hoisted(() => ({ connectDB: vi.fn() }));
const notificationFind = vi.hoisted(() => vi.fn());
const notificationCount = vi.hoisted(() => vi.fn());
const notificationInsertMany = vi.hoisted(() => vi.fn());
const notifyOverdueInvoice = vi.hoisted(() => vi.fn());
const notifyShootReminder = vi.hoisted(() => vi.fn());
const notifyApproachingDeadline = vi.hoisted(() => vi.fn());
const paymentFind = vi.hoisted(() => vi.fn());
const shootFind = vi.hoisted(() => vi.fn());
const videoFind = vi.hoisted(() => vi.fn());
const scriptFind = vi.hoisted(() => vi.fn());
const clientFind = vi.hoisted(() => vi.fn());

vi.mock("@/lib/session", () => ({ getSession }));
vi.mock("@/lib/db", () => ({ connectDB }));
vi.mock("@/models/Notification", () => ({
  Notification: {
    find: (...args: unknown[]) => notificationFind(...args),
    countDocuments: (...args: unknown[]) => notificationCount(...args),
    insertMany: (...args: unknown[]) => notificationInsertMany(...args),
    updateMany: vi.fn(),
  },
}));
vi.mock("@/lib/notifications/triggers", () => ({
  notifyOverdueInvoice: (...args: unknown[]) => notifyOverdueInvoice(...args),
  notifyShootReminder: (...args: unknown[]) => notifyShootReminder(...args),
  notifyApproachingDeadline: (...args: unknown[]) =>
    notifyApproachingDeadline(...args),
}));
vi.mock("@/models/Payment", () => ({
  Payment: { find: (...args: unknown[]) => paymentFind(...args) },
}));
vi.mock("@/models/Shoot", () => ({
  Shoot: { find: (...args: unknown[]) => shootFind(...args) },
}));
vi.mock("@/models/Video", () => ({
  Video: { find: (...args: unknown[]) => videoFind(...args) },
}));
vi.mock("@/models/Script", () => ({
  Script: { find: (...args: unknown[]) => scriptFind(...args) },
}));
vi.mock("@/models/Client", () => ({
  Client: { find: (...args: unknown[]) => clientFind(...args) },
}));

function leanQuery(docs: unknown[]) {
  return { sort: vi.fn().mockReturnValue({ limit: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(docs) }) }), lean: vi.fn().mockResolvedValue(docs) };
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

describe("notification channels", () => {
  beforeEach(async () => {
    const { resetNotificationChannels } = await import("@/lib/notifications/channels");
    resetNotificationChannels([]);
  });

  it("fans out to a newly registered channel without changing emit call sites", async () => {
    const received: unknown[] = [];
    const { emitNotification, registerNotificationChannel } = await import(
      "@/lib/notifications"
    );

    registerNotificationChannel({
      name: "email",
      async send(payload) {
        received.push(payload.type);
      },
    });

    await emitNotification({
      type: "Payment Recorded",
      title: "Payment recorded",
      body: "₹8,000 recorded",
      entityType: "Payment",
      entityId: PAYMENT_ID,
      userIds: [USER_ID],
    });

    expect(received).toEqual(["Payment Recorded"]);
  });
});

describe("in-app channel", () => {
  beforeEach(() => {
    connectDB.mockResolvedValue(undefined);
    notificationInsertMany.mockReset().mockResolvedValue([]);
  });

  it("writes one document per recipient and skips the actor", async () => {
    const { inAppChannel } = await import("@/lib/notifications/channels");
    await inAppChannel.send({
      type: "New Client Onboarding",
      title: "New client onboarded",
      body: "Northstar joined",
      entityType: "Client",
      entityId: CLIENT_ID,
      clientId: CLIENT_ID,
      href: `/clients/${CLIENT_ID}`,
      userIds: [USER_ID, USER_ID, OTHER_USER_ID],
      excludeUserId: USER_ID,
      dedupeKey: `client-onboarded:${CLIENT_ID}`,
    });

    expect(notificationInsertMany).toHaveBeenCalledTimes(1);
    const docs = notificationInsertMany.mock.calls[0][0] as Array<{
      userId: string;
      channel: string;
      dedupeKey: string | null;
    }>;
    expect(docs).toHaveLength(1);
    expect(docs[0]?.userId).toBe(OTHER_USER_ID);
    expect(docs[0]?.channel).toBe("in-app");
    expect(docs[0]?.dedupeKey).toContain("client-onboarded");
  });

  it("swallows duplicate-key errors from the unique index", async () => {
    notificationInsertMany.mockRejectedValue({ code: 11000 });
    const { inAppChannel } = await import("@/lib/notifications/channels");
    await expect(
      inAppChannel.send({
        type: "Overdue Invoice",
        title: "Overdue invoice",
        body: "Balance due",
        entityType: "Payment",
        entityId: PAYMENT_ID,
        userIds: [USER_ID],
        dedupeKey: `overdue:${PAYMENT_ID}`,
      }),
    ).resolves.toBeUndefined();
  });
});

describe("GET /api/notifications", () => {
  beforeEach(() => {
    getSession.mockReset().mockResolvedValue(ownerSession());
    connectDB.mockResolvedValue(undefined);
    shootFind.mockReset().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) });
    videoFind.mockReset().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) });
    scriptFind.mockReset().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) });
    paymentFind.mockReset().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) });
    notificationFind.mockReset().mockReturnValue(
      leanQuery([
        {
          _id: "eeeeeeeeeeeeeeeeeeeeeeee",
          type: "Payment Recorded",
          title: "Payment recorded",
          body: "₹8,000 recorded",
          entityType: "Payment",
          entityId: PAYMENT_ID,
          readAt: null,
          createdAt: "2026-09-18T10:00:00.000Z",
        },
      ]),
    );
    notificationCount.mockReset().mockResolvedValue(1);
  });

  it("returns only the signed-in user's feed", async () => {
    const { GET } = await import("@/app/api/notifications/route");
    const response = await GET(new Request("http://localhost/api/notifications"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.unreadCount).toBe(1);
    expect(body.notifications[0].title).toBe("Payment recorded");
    expect(String(notificationFind.mock.calls[0][0].userId)).toBe(USER_ID);
  });
});

describe("due notification dispatcher", () => {
  beforeEach(async () => {
    connectDB.mockResolvedValue(undefined);
    notifyOverdueInvoice.mockReset().mockResolvedValue(undefined);
    notifyShootReminder.mockReset().mockResolvedValue(undefined);
    notifyApproachingDeadline.mockReset().mockResolvedValue(undefined);
    shootFind.mockReset().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) });
    videoFind.mockReset().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) });
    scriptFind.mockReset().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) });
    paymentFind.mockReset().mockReturnValue({
      lean: vi.fn().mockResolvedValue([
        {
          _id: PAYMENT_ID,
          clientId: CLIENT_ID,
          invoiceAmount: 80000,
          amountReceived: 0,
          status: "Overdue",
        },
      ]),
    });
    clientFind.mockReset().mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          { _id: CLIENT_ID, companyName: "Northstar UGC Studio", assignedEmployeeId: null },
        ]),
      }),
    });
    const { resetNotificationDispatchClock } = await import(
      "@/lib/notifications/scheduler"
    );
    resetNotificationDispatchClock();
  });

  it("emits overdue invoice notifications from live payment documents", async () => {
    const { dispatchDueNotifications } = await import(
      "@/lib/notifications/scheduler"
    );
    const result = await dispatchDueNotifications({ force: true });
    expect(result.ran).toBe(true);
    expect(notifyOverdueInvoice).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentId: PAYMENT_ID,
        clientId: CLIENT_ID,
        pendingBalance: 80000,
        companyName: "Northstar UGC Studio",
      }),
    );
  });
});
