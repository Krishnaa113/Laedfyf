import { beforeEach, describe, expect, it, vi } from "vitest";

const VIDEO_ID = "ffffffffffffffffffffffff";
const ORDER_ID = "cccccccccccccccccccccccc";
const CLIENT_ID = "aaaaaaaaaaaaaaaaaaaaaaaa";
const OTHER_CLIENT_ID = "bbbbbbbbbbbbbbbbbbbbbbbb";
const USER_ID = "eeeeeeeeeeeeeeeeeeeeeeee";

const withTransaction = vi.hoisted(() =>
  vi.fn(async (fn: () => Promise<unknown>) => fn()),
);
const endSession = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const startDbSession = vi.hoisted(() =>
  vi.fn(async () => ({ withTransaction, endSession })),
);
const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));
const { connectDB } = vi.hoisted(() => ({ connectDB: vi.fn() }));
const videoFindById = vi.hoisted(() => vi.fn());
const videoFindByIdAndUpdate = vi.hoisted(() => vi.fn());
const orderFindById = vi.hoisted(() => vi.fn());
const videoSave = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const orderSave = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const paymentFind = vi.hoisted(() => vi.fn());

vi.mock("@/lib/session", () => ({ getSession }));
vi.mock("@/lib/db", () => ({
  connectDB,
  startDbSession,
}));
vi.mock("@/lib/activity", () => ({ logActivity: vi.fn() }));
vi.mock("@/models/Video", () => ({
  Video: {
    findById: (...args: unknown[]) => videoFindById(...args),
    findByIdAndUpdate: (...args: unknown[]) => videoFindByIdAndUpdate(...args),
  },
}));
vi.mock("@/models/Order", () => ({
  Order: {
    findById: (...args: unknown[]) => orderFindById(...args),
  },
}));
vi.mock("@/models/Payment", () => ({
  Payment: {
    find: (...args: unknown[]) => paymentFind(...args),
  },
}));

function clientSession(clientId = CLIENT_ID) {
  return {
    user: {
      id: "client-user-1",
      name: "Portal User",
      email: "client@example.com",
      role: "client" as const,
      employeeSubRole: null,
      clientId,
    },
  };
}

function videoDoc(overrides: Record<string, unknown> = {}) {
  return {
    _id: VIDEO_ID,
    clientId: CLIENT_ID,
    orderId: ORDER_ID,
    status: "Client Review",
    fileLink: "https://drive.example/cut",
    finalDeliveryLink: "",
    thumbnailUrl: "",
    feedbackLog: [] as unknown[],
    save: videoSave,
    ...overrides,
  };
}

function orderDoc(overrides: Record<string, unknown> = {}) {
  return {
    _id: ORDER_ID,
    clientId: CLIENT_ID,
    contractedVideoCount: 8,
    completedVideos: 2,
    remainingQuota: 6,
    save: orderSave,
    ...overrides,
  };
}

function paidPaymentQuery() {
  const query = {
    session: vi.fn(),
    lean: vi.fn().mockResolvedValue([
      { invoiceAmount: 1000, amountReceived: 1000, status: "Paid" },
    ]),
  };
  query.session.mockReturnValue(query);
  return query;
}

function unpaidPaymentQuery() {
  const query = {
    session: vi.fn(),
    lean: vi.fn().mockResolvedValue([]),
  };
  query.session.mockReturnValue(query);
  return query;
}

function sessionQuery(doc: unknown, leanDoc: unknown) {
  const afterSession = {
    populate: vi.fn(),
    lean: vi.fn().mockResolvedValue(leanDoc),
    then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve(doc).then(resolve, reject),
  };
  afterSession.populate.mockReturnValue(afterSession);
  return { session: vi.fn().mockReturnValue(afterSession) };
}

describe("deliverVideoInTransaction", () => {
  beforeEach(() => {
    withTransaction.mockClear().mockImplementation(async (fn) => fn());
    endSession.mockClear().mockResolvedValue(undefined);
    startDbSession.mockClear().mockResolvedValue({ withTransaction, endSession });
    videoSave.mockReset().mockResolvedValue(undefined);
    orderSave.mockReset().mockResolvedValue(undefined);
    paymentFind.mockReset().mockReturnValue(paidPaymentQuery());
    const video = videoDoc();
    const order = orderDoc();
    videoFindById.mockReset().mockReturnValue(
      sessionQuery(video, {
        ...video,
        status: "Delivered",
        finalDeliveryLink: "https://drive.example/final",
      }),
    );
    orderFindById.mockReset().mockReturnValue(sessionQuery(order, order));
  });

  it("uses session.withTransaction to deliver the video and update order counters", async () => {
    const { deliverVideoInTransaction } = await import("@/lib/videos/delivery");
    const result = await deliverVideoInTransaction({
      videoId: VIDEO_ID,
      finalDeliveryLink: "https://drive.example/final",
    });

    expect(startDbSession).toHaveBeenCalledTimes(1);
    expect(withTransaction).toHaveBeenCalledTimes(1);
    expect(endSession).toHaveBeenCalledTimes(1);
    expect(videoSave).toHaveBeenCalledTimes(1);
    expect(orderSave).toHaveBeenCalledTimes(1);
    expect(videoSave.mock.invocationCallOrder[0]).toBeLessThan(
      orderSave.mock.invocationCallOrder[0],
    );
    expect(result.completedVideos).toBe(3);
    expect(result.remainingQuota).toBe(5);
  });

  it("does not touch the order when the video is already delivered", async () => {
    videoFindById.mockReturnValue(
      sessionQuery(videoDoc({ status: "Delivered" }), videoDoc({ status: "Delivered" })),
    );
    const { deliverVideoInTransaction, DeliveryError } = await import(
      "@/lib/videos/delivery"
    );

    await expect(
      deliverVideoInTransaction({
        videoId: VIDEO_ID,
        finalDeliveryLink: "https://drive.example/final",
      }),
    ).rejects.toBeInstanceOf(DeliveryError);
    expect(orderSave).not.toHaveBeenCalled();
  });

  it("ends the session if the order write fails inside the transaction", async () => {
    orderSave.mockRejectedValue(new Error("quota write failed"));
    const { deliverVideoInTransaction } = await import("@/lib/videos/delivery");

    await expect(
      deliverVideoInTransaction({
        videoId: VIDEO_ID,
        finalDeliveryLink: "https://drive.example/final",
      }),
    ).rejects.toThrow("quota write failed");
    expect(withTransaction).toHaveBeenCalled();
    expect(endSession).toHaveBeenCalledTimes(1);
  });

  it("blocks delivery when the order payment status is Overdue", async () => {
    const query = {
      session: vi.fn(),
      lean: vi.fn().mockResolvedValue([
        { invoiceAmount: 1000, amountReceived: 100, status: "Overdue" },
      ]),
    };
    query.session.mockReturnValue(query);
    paymentFind.mockReturnValue(query);

    const { deliverVideoInTransaction, DeliveryError } = await import(
      "@/lib/videos/delivery"
    );

    await expect(
      deliverVideoInTransaction({
        videoId: VIDEO_ID,
        finalDeliveryLink: "https://drive.example/final",
      }),
    ).rejects.toBeInstanceOf(DeliveryError);
    expect(videoSave).not.toHaveBeenCalled();
    expect(orderSave).not.toHaveBeenCalled();
  });

  it("blocks delivery when the order payment status is Unpaid", async () => {
    paymentFind.mockReturnValue(unpaidPaymentQuery());
    const { deliverVideoInTransaction, DeliveryError } = await import(
      "@/lib/videos/delivery"
    );

    await expect(
      deliverVideoInTransaction({
        videoId: VIDEO_ID,
        finalDeliveryLink: "https://drive.example/final",
      }),
    ).rejects.toBeInstanceOf(DeliveryError);
    expect(videoSave).not.toHaveBeenCalled();
    expect(orderSave).not.toHaveBeenCalled();
  });
});

describe("client video approval", () => {
  beforeEach(() => {
    getSession.mockReset().mockResolvedValue(clientSession());
    connectDB.mockResolvedValue(undefined);
    withTransaction.mockClear().mockImplementation(async (fn) => fn());
    endSession.mockClear().mockResolvedValue(undefined);
    startDbSession.mockClear().mockResolvedValue({ withTransaction, endSession });
    videoSave.mockReset().mockResolvedValue(undefined);
    orderSave.mockReset().mockResolvedValue(undefined);
    paymentFind.mockReset().mockReturnValue(paidPaymentQuery());
    videoFindById.mockReset().mockReturnValue({
      lean: vi.fn().mockResolvedValue(
        videoDoc({
          status: "Client Review",
          fileLink: "https://drive.example/cut",
        }),
      ),
    });
    videoFindByIdAndUpdate.mockReset();
  });

  it("blocks approval of another client's video", async () => {
    getSession.mockResolvedValue(clientSession(CLIENT_ID));
    videoFindById.mockReturnValue({
      lean: vi.fn().mockResolvedValue(
        videoDoc({ clientId: OTHER_CLIENT_ID, status: "Client Review" }),
      ),
    });

    const { PATCH } = await import("@/app/api/videos/[id]/review/route");
    const response = await PATCH(
      new Request(`http://localhost/api/videos/${VIDEO_ID}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      }),
      { params: Promise.resolve({ id: VIDEO_ID }) },
    );

    expect(response.status).toBe(403);
    expect(withTransaction).not.toHaveBeenCalled();
  });

  it("rejects approval unless the video is in Client Review", async () => {
    videoFindById.mockReturnValue({
      lean: vi.fn().mockResolvedValue(videoDoc({ status: "Video Editing" })),
    });
    const { PATCH } = await import("@/app/api/videos/[id]/review/route");
    const response = await PATCH(
      new Request(`http://localhost/api/videos/${VIDEO_ID}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      }),
      { params: Promise.resolve({ id: VIDEO_ID }) },
    );
    expect(response.status).toBe(400);
  });

  it("approves from Client Review through the delivery transaction", async () => {
    getSession.mockResolvedValue(clientSession());
    const video = videoDoc();
    const order = orderDoc();
    videoFindById
      .mockReturnValueOnce({ lean: vi.fn().mockResolvedValue(video) })
      .mockReturnValue(sessionQuery(video, { ...video, status: "Delivered" }));
    orderFindById.mockReturnValue(sessionQuery(order, order));

    const { PATCH } = await import("@/app/api/videos/[id]/review/route");
    const response = await PATCH(
      new Request(`http://localhost/api/videos/${VIDEO_ID}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve",
          finalDeliveryLink: "https://drive.example/final",
        }),
      }),
      { params: Promise.resolve({ id: VIDEO_ID }) },
    );

    expect(response.status).toBe(200);
    expect(withTransaction).toHaveBeenCalled();
    expect(orderSave).toHaveBeenCalled();
  });
});

describe("editor dashboard buckets", () => {
  it("sorts overdue, due today, due tomorrow, and completed", async () => {
    const { groupEditorDashboard } = await import("@/lib/videos/dashboard");
    const grouped = groupEditorDashboard(
      [
        {
          id: "1",
          status: "Video Editing",
          deadline: "2026-09-17T10:00:00.000Z",
          updatedAt: "2026-09-17T10:00:00.000Z",
        },
        {
          id: "2",
          status: "Internal QA",
          deadline: "2026-09-18T10:00:00.000Z",
          updatedAt: "2026-09-18T10:00:00.000Z",
        },
        {
          id: "3",
          status: "Client Review",
          deadline: "2026-09-19T10:00:00.000Z",
          updatedAt: "2026-09-18T10:00:00.000Z",
        },
        {
          id: "4",
          status: "Delivered",
          deadline: "2026-09-10T10:00:00.000Z",
          updatedAt: "2026-09-16T10:00:00.000Z",
        },
      ] as never,
      "2026-09-18",
    );

    expect(grouped.overdue.map((video) => video.id)).toEqual(["1"]);
    expect(grouped.dueToday.map((video) => video.id)).toEqual(["2"]);
    expect(grouped.dueTomorrow.map((video) => video.id)).toEqual(["3"]);
    expect(grouped.completed.map((video) => video.id)).toEqual(["4"]);
  });

  it("sorts revision-priority videos ahead of later deadlines in the same bucket", async () => {
    const { groupEditorDashboard } = await import("@/lib/videos/dashboard");
    const grouped = groupEditorDashboard(
      [
        {
          id: "later",
          status: "Video Editing",
          deadline: "2026-09-22T10:00:00.000Z",
          revisionPriority: false,
        },
        {
          id: "priority",
          status: "Revision",
          deadline: "2026-09-25T10:00:00.000Z",
          revisionPriority: true,
        },
      ] as never,
      "2026-09-18",
    );

    expect(grouped.upcoming.map((video) => video.id)).toEqual(["priority", "later"]);
  });
});

describe("client video revision", () => {
  const EDITOR_ID = "dddddddddddddddddddddddd";

  beforeEach(() => {
    getSession.mockReset().mockResolvedValue(clientSession());
    connectDB.mockResolvedValue(undefined);
    videoFindById.mockReset().mockReturnValue({
      lean: vi.fn().mockResolvedValue(
        videoDoc({
          editorId: EDITOR_ID,
          revisionCount: 1,
        }),
      ),
    });
    const after = {
      populate: vi.fn(),
      lean: vi.fn().mockResolvedValue({
        _id: VIDEO_ID,
        clientId: CLIENT_ID,
        editorId: EDITOR_ID,
        status: "Revision",
        revisionCount: 2,
        revisionPriority: true,
        feedbackLog: [],
      }),
    };
    after.populate.mockReturnValue(after);
    videoFindByIdAndUpdate.mockReset().mockReturnValue(after);
  });

  it("increments the revision counter, flags priority, reassigns the editor, and timestamps feedback", async () => {
    const { PATCH } = await import("@/app/api/videos/[id]/review/route");
    const response = await PATCH(
      new Request(`http://localhost/api/videos/${VIDEO_ID}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revision", body: "Fix the intro" }),
      }),
      { params: Promise.resolve({ id: VIDEO_ID }) },
    );

    expect(response.status).toBe(200);
    const update = videoFindByIdAndUpdate.mock.calls[0][1] as {
      $set: Record<string, unknown>;
      $inc: Record<string, number>;
      $push: { feedbackLog: Record<string, unknown> };
    };
    expect(update.$set.status).toBe("Revision");
    expect(update.$set.revisionPriority).toBe(true);
    expect(update.$set.editorId).toBe(EDITOR_ID);
    expect(update.$set.revisionRequestedAt).toBeInstanceOf(Date);
    expect(update.$inc.revisionCount).toBe(1);
    expect(update.$push.feedbackLog.body).toBe("Fix the intro");
    expect(update.$push.feedbackLog.createdAt).toBeInstanceOf(Date);
    expect(update.$push.feedbackLog.decision).toBe("Request Revision");
  });
});
