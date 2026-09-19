import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { PAYOUT_POPULATE } from "@/lib/populate";
import type { AuthOk } from "@/lib/rbac";
import { serializePayout, type SerializedPayout } from "@/lib/serialize";
import { normalizePayoutStatus } from "@/lib/status";
import { Creator } from "@/models/Creator";
import { CreatorPayout } from "@/models/CreatorPayout";
import { Order } from "@/models/Order";
import { Video } from "@/models/Video";

export async function loadPayoutList(
  auth: AuthOk,
  query: { status?: string; creatorId?: string } = {},
) {
  await connectDB();
  const filter: Record<string, unknown> = {};
  if (query.status) {
    filter.status = normalizePayoutStatus(query.status);
  }
  if (query.creatorId) {
    filter.creatorId = new mongoose.Types.ObjectId(query.creatorId);
  }

  const docs = await CreatorPayout.find(filter)
    .populate(PAYOUT_POPULATE)
    .sort({ createdAt: -1 })
    .lean();

  void auth;

  return docs
    .map((doc) => serializePayout(doc as Record<string, unknown>))
    .filter((payout): payout is SerializedPayout => Boolean(payout));
}

export async function loadPayoutHub(auth: AuthOk, payoutId: string) {
  await connectDB();
  const doc = await CreatorPayout.findById(payoutId).populate(PAYOUT_POPULATE).lean();
  if (!doc) {
    return { ok: false as const, status: 404 as const };
  }
  void auth;
  const payout = serializePayout(doc as Record<string, unknown>);
  if (!payout) {
    return { ok: false as const, status: 404 as const };
  }
  return { ok: true as const, hub: { payout } };
}

export async function assertPayoutRefs(input: {
  creatorId: string;
  orderId?: string | null;
  videoId: string;
}): Promise<{ ok: true; rate: number } | { ok: false; status: number; error: string }> {
  const creator = await Creator.findById(input.creatorId).lean();
  if (!creator) {
    return { ok: false, status: 404, error: "Creator not found" };
  }

  const video = await Video.findById(input.videoId).lean();
  if (!video) {
    return { ok: false, status: 404, error: "Video not found" };
  }

  if (input.orderId) {
    const order = await Order.findById(input.orderId).lean();
    if (!order) {
      return { ok: false, status: 404, error: "Order not found" };
    }
    if (String(video.orderId) !== String(order._id)) {
      return { ok: false, status: 400, error: "Video does not belong to this order" };
    }
  }

  return { ok: true, rate: Number(creator.rate ?? 0) };
}
