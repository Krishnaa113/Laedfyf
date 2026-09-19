import type { ClientSession } from "mongoose";
import { startDbSession } from "@/lib/db";
import { isUnpaidDeliveryBlocked } from "@/lib/finance/config";
import { getOrderPaymentStatus } from "@/lib/finance/order-payment";
import { VIDEO_POPULATE } from "@/lib/populate";
import { serializeVideo } from "@/lib/serialize";
import { normalizeVideoStatus } from "@/lib/status";
import { Order } from "@/models/Order";
import { Video } from "@/models/Video";

export type VideoFeedbackEntry = {
  authorId: string | null;
  authorName: string;
  authorRole: string;
  body: string;
  timecode?: string;
  createdAt?: Date;
  decision: "Approve" | "Request Revision" | "Comment";
};

export class DeliveryError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function applyDelivery(
  session: ClientSession,
  input: {
    videoId: string;
    finalDeliveryLink: string;
    feedback?: VideoFeedbackEntry | null;
    audience?: "internal" | "portal";
  },
) {
  const existing = await Video.findById(input.videoId).session(session);
  if (!existing) {
    throw new DeliveryError(404, "Video not found");
  }

  if (normalizeVideoStatus(existing.status) === "Delivered") {
    throw new DeliveryError(400, "Video is already delivered");
  }

  if (!existing.orderId) {
    throw new DeliveryError(400, "Video is missing an order");
  }

  if (isUnpaidDeliveryBlocked()) {
    const paymentStatus = await getOrderPaymentStatus(
      String(existing.orderId),
      session,
    );
    if (paymentStatus === "Unpaid" || paymentStatus === "Overdue") {
      throw new DeliveryError(
        400,
        `Cannot mark this video as Delivered while the order payment status is ${paymentStatus}.`,
      );
    }
  }

  const finalDeliveryLink =
    input.finalDeliveryLink.trim() || String(existing.finalDeliveryLink ?? "").trim() || String(existing.fileLink ?? "").trim();
  if (!finalDeliveryLink) {
    throw new DeliveryError(400, "A final delivery link is required");
  }

  existing.status = "Delivered";
  existing.finalDeliveryLink = finalDeliveryLink;
  existing.revisionPriority = false;
  existing.revisionRequestedAt = null;
  if (input.feedback) {
    if (!Array.isArray(existing.feedbackLog)) {
      existing.feedbackLog = [];
    }
    existing.feedbackLog.push({
      ...input.feedback,
      createdAt: new Date(),
    } as never);
  }
  await existing.save({ session });

  const order = await Order.findById(existing.orderId).session(session);
  if (!order) {
    throw new DeliveryError(404, "Order not found");
  }

  const completed = Number(order.completedVideos ?? 0);
  const contracted = Number(order.contractedVideoCount ?? 0);
  const remaining =
    order.remainingQuota == null
      ? Math.max(0, contracted - completed)
      : Number(order.remainingQuota);

  order.completedVideos = completed + 1;
  order.remainingQuota = Math.max(0, remaining - 1);
  await order.save({ session });

  const populated = await Video.findById(existing._id)
    .session(session)
    .populate(VIDEO_POPULATE)
    .lean();

  return {
    video: serializeVideo(populated as Record<string, unknown> | null, {
      audience: input.audience,
    }),
    completedVideos: order.completedVideos,
    remainingQuota: order.remainingQuota,
  };
}

export async function deliverVideoInTransaction(input: {
  videoId: string;
  finalDeliveryLink: string;
  feedback?: VideoFeedbackEntry | null;
  audience?: "internal" | "portal";
}) {
  const session = await startDbSession();
  try {
    let result: Awaited<ReturnType<typeof applyDelivery>> | null = null;
    await session.withTransaction(async () => {
      result = await applyDelivery(session, input);
    });
    if (!result) {
      throw new DeliveryError(500, "Delivery did not complete");
    }
    return result;
  } finally {
    await session.endSession();
  }
}
