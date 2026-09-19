import { beforeEach, describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";

const videoAggregate = vi.hoisted(() => vi.fn());

vi.mock("@/models/Video", () => ({
  Video: {
    aggregate: (...args: unknown[]) => videoAggregate(...args),
    find: vi.fn(),
  },
}));

describe("live order production counters", () => {
  beforeEach(() => {
    videoAggregate.mockReset();
  });

  it("aggregates Video documents by orderId and ignores stored order fields", async () => {
    const orderId = new mongoose.Types.ObjectId("cccccccccccccccccccccccc");
    videoAggregate.mockResolvedValue([
      {
        _id: orderId,
        ordered: 3,
        assigned: 2,
        completed: 1,
        delivered: 1,
      },
    ]);

    const { aggregateProductionByOrderIds } = await import(
      "@/lib/orders/production"
    );
    const counters = await aggregateProductionByOrderIds(
      [orderId],
      new Map([[String(orderId), 8]]),
    );

    expect(videoAggregate).toHaveBeenCalledTimes(1);
    const pipeline = videoAggregate.mock.calls[0][0] as { $match?: { orderId?: { $in: unknown[] } } }[];
    expect(pipeline[0].$match?.orderId?.$in).toEqual([orderId]);
    expect(counters.get(String(orderId))).toEqual({
      ordered: 3,
      assigned: 2,
      completed: 1,
      delivered: 1,
      remaining: 7,
    });
  });

  it("does not treat stale orderedVideos on the Order document as source of truth", async () => {
    const { serializeOrder } = await import("@/lib/serialize");
    const serialized = serializeOrder({
      _id: "dddddddddddddddddddddddd",
      packageName: "Starter 8",
      contractedVideoCount: 8,
      orderedVideos: 99,
      assignedVideos: 99,
      completedVideos: 99,
      deliveredVideos: 99,
      remainingQuota: 99,
      production: {
        ordered: 2,
        assigned: 1,
        completed: 0,
        delivered: 0,
        remaining: 8,
      },
    });

    expect(serialized?.orderedVideos).toBe(2);
    expect(serialized?.assignedVideos).toBe(1);
    expect(serialized?.remainingQuota).toBe(8);
    expect(serialized?.production.ordered).toBe(2);
  });

  it("omits internal costs and assigned team from portal order payloads", async () => {
    const { serializeOrder } = await import("@/lib/serialize");
    const serialized = serializeOrder(
      {
        _id: "dddddddddddddddddddddddd",
        packageName: "Starter 8",
        contractedVideoCount: 8,
        pricing: 88000,
        gstTax: 15840,
        totalInvoiceAmount: 103840,
        amountReceived: 20000,
        assignedEmployeeIds: ["eeeeeeeeeeeeeeeeeeeeeeee"],
        production: {
          ordered: 2,
          assigned: 1,
          completed: 0,
          delivered: 0,
          remaining: 8,
        },
      },
      { audience: "portal" },
    );

    expect(serialized).not.toHaveProperty("pricing");
    expect(serialized).not.toHaveProperty("gstTax");
    expect(serialized).not.toHaveProperty("totalInvoiceAmount");
    expect(serialized).not.toHaveProperty("amountReceived");
    expect(serialized).not.toHaveProperty("outstandingBalance");
    expect(serialized?.assignedTeam).toEqual([]);
    expect(serialized?.packageName).toBe("Starter 8");
    expect(serialized?.production.remaining).toBe(8);
  });

  it("omits editor identity from portal video payloads", async () => {
    const { serializeVideo } = await import("@/lib/serialize");
    const serialized = serializeVideo(
      {
        _id: "ffffffffffffffffffffffff",
        packageName: "Starter 8",
        editorId: {
          _id: "eeeeeeeeeeeeeeeeeeeeeeee",
          userId: { _id: "111111111111111111111111", name: "Editor One" },
        },
        revisionPriority: true,
        revisionRequestedAt: "2026-09-18T10:00:00.000Z",
        status: "Revision",
        feedbackLog: [],
      },
      { audience: "portal" },
    );

    expect(serialized?.editorId).toBeNull();
    expect(serialized?.assignedEditorName).toBe("");
    expect(serialized?.revisionPriority).toBe(false);
    expect(serialized?.revisionRequestedAt).toBeNull();
  });

  it("omits creator identity from portal script and video payloads", async () => {
    const { serializeScript, serializeVideo } = await import("@/lib/serialize");
    const script = serializeScript(
      {
        _id: "ffffffffffffffffffffffff",
        creatorId: { _id: "cccccccccccccccccccccccc", name: "Hidden Creator" },
        videoNumber: 1,
        comments: [],
      },
      { audience: "portal" },
    );
    const video = serializeVideo(
      {
        _id: "ffffffffffffffffffffffff",
        creatorId: { _id: "cccccccccccccccccccccccc", name: "Hidden Creator" },
        status: "Client Review",
        feedbackLog: [],
      },
      { audience: "portal" },
    );

    expect(script?.creatorId).toBeNull();
    expect(script?.creatorName).toBe("");
    expect(video?.creatorId).toBeNull();
    expect(video?.creatorName).toBe("");
  });
});
