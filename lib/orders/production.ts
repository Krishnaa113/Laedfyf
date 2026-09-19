import mongoose from "mongoose";
import { Video } from "@/models/Video";

export type ProductionCounter = {
  ordered: number;
  assigned: number;
  completed: number;
  delivered: number;
  remaining: number;
};

const ASSIGNED_STATUSES = [
  "Shoot Pending",
  "Raw Footage Received",
  "Video Editing",
  "Internal QA",
  "Client Review",
  "Revision",
  "Final Approved",
  "Delivered",
];

const COMPLETED_STATUSES = ["Final Approved", "Delivered"];

export function emptyProduction(contractedVideoCount = 0): ProductionCounter {
  return {
    ordered: 0,
    assigned: 0,
    completed: 0,
    delivered: 0,
    remaining: Math.max(0, contractedVideoCount),
  };
}

export async function aggregateProductionByOrderIds(
  orderIds: mongoose.Types.ObjectId[],
  contractedByOrderId: Map<string, number>,
  extraMatch: Record<string, unknown> = {},
): Promise<Map<string, ProductionCounter>> {
  const result = new Map<string, ProductionCounter>();

  for (const [id, contracted] of contractedByOrderId) {
    result.set(id, emptyProduction(contracted));
  }

  if (orderIds.length === 0) {
    return result;
  }

  const rows = await Video.aggregate<{
    _id: mongoose.Types.ObjectId;
    ordered: number;
    assigned: number;
    completed: number;
    delivered: number;
  }>([
    {
      $match: {
        ...extraMatch,
        orderId: { $in: orderIds },
      },
    },
    {
      $group: {
        _id: "$orderId",
        ordered: { $sum: 1 },
        assigned: {
          $sum: {
            $cond: [
              {
                $or: [
                  { $in: ["$status", ASSIGNED_STATUSES] },
                  { $and: [{ $ne: ["$creatorId", null] }, { $ne: ["$creatorId", undefined] }] },
                  { $and: [{ $ne: ["$editorId", null] }, { $ne: ["$editorId", undefined] }] },
                ],
              },
              1,
              0,
            ],
          },
        },
        completed: {
          $sum: {
            $cond: [{ $in: ["$status", COMPLETED_STATUSES] }, 1, 0],
          },
        },
        delivered: {
          $sum: {
            $cond: [{ $eq: ["$status", "Delivered"] }, 1, 0],
          },
        },
      },
    },
  ]);

  for (const row of rows) {
    const id = String(row._id);
    const contracted = contractedByOrderId.get(id) ?? 0;
    result.set(id, {
      ordered: row.ordered,
      assigned: row.assigned,
      completed: row.completed,
      delivered: row.delivered,
      remaining: Math.max(0, contracted - row.delivered),
    });
  }

  return result;
}

export async function attachLiveProduction(
  docs: Record<string, unknown>[],
  extraMatch: Record<string, unknown> = {},
) {
  const contractedByOrderId = new Map<string, number>();
  const orderIds: mongoose.Types.ObjectId[] = [];

  for (const doc of docs) {
    const id = String(doc._id);
    contractedByOrderId.set(id, Number(doc.contractedVideoCount ?? 0));
    orderIds.push(new mongoose.Types.ObjectId(id));
  }

  const counters = await aggregateProductionByOrderIds(
    orderIds,
    contractedByOrderId,
    extraMatch,
  );

  return docs.map((doc) => ({
    ...doc,
    production: counters.get(String(doc._id)) ?? emptyProduction(Number(doc.contractedVideoCount ?? 0)),
  }));
}
