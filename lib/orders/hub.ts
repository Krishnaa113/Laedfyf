import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { attachLiveProduction } from "@/lib/orders/production";
import { ORDER_POPULATE } from "@/lib/populate";
import type { AuthOk } from "@/lib/rbac";
import {
  serializeOptions,
  serializeOrder,
  serializeVideo,
  type SerializedOrder,
} from "@/lib/serialize";
import { normalizeOrderStatus } from "@/lib/status";
import { Client } from "@/models/Client";
import { Employee } from "@/models/Employee";
import { Order } from "@/models/Order";
import { User } from "@/models/User";
import { Video } from "@/models/Video";

void Employee;
void User;

export const STALE_PRODUCTION_FIELDS = {
  orderedVideos: 1,
  assignedVideos: 1,
  deliveredVideos: 1,
};

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function loadOrderList(
  auth: AuthOk,
  query: { q?: string; status?: string; clientId?: string } = {},
) {
  await connectDB();

  const filter: Record<string, unknown> = {};
  if (query.clientId) {
    filter.clientId = new mongoose.Types.ObjectId(query.clientId);
  }
  if (query.status) {
    filter.status = normalizeOrderStatus(query.status);
  }
  if (query.q?.trim()) {
    const rx = new RegExp(escapeRegex(query.q.trim()), "i");
    filter.packageName = rx;
  }

  const docs = await Order.find(auth.byClient(filter))
    .populate(ORDER_POPULATE)
    .sort({ createdAt: -1 })
    .lean();

  const withProduction = await attachLiveProduction(docs, auth.byClient());
  const options = serializeOptions(auth.session.user);
  return withProduction
    .map((doc) => serializeOrder(doc, options))
    .filter((order): order is SerializedOrder => Boolean(order));
}

export async function loadOrderHub(auth: AuthOk, orderId: string) {
  await connectDB();

  const orderDoc = await Order.findById(orderId).populate(ORDER_POPULATE).lean();
  if (!orderDoc) {
    return null;
  }

  const clientId = String(
    orderDoc.clientId && typeof orderDoc.clientId === "object" && "_id" in orderDoc.clientId
      ? (orderDoc.clientId as { _id: unknown })._id
      : orderDoc.clientId,
  );

  if (!auth.canAccessClient(clientId)) {
    return null;
  }

  const [withProduction, videoDocs, client] = await Promise.all([
    attachLiveProduction([orderDoc], auth.byClient()),
    Video.find(auth.byClient({ orderId: new mongoose.Types.ObjectId(orderId) }))
      .sort({ createdAt: -1 })
      .lean(),
    Client.findById(clientId).lean(),
  ]);

  const options = serializeOptions(auth.session.user);
  const order = serializeOrder(withProduction[0], options);
  if (!order) {
    return null;
  }

  return {
    order,
    videos: videoDocs
      .map((doc) => serializeVideo(doc, options))
      .filter((video): video is NonNullable<typeof video> => Boolean(video)),
    clientName: client ? String(client.name ?? "") : order.clientName,
    companyName: client ? String(client.companyName ?? "") : order.companyName,
  };
}

export function invoiceTotal(pricing: number, gstTax: number) {
  return Number(pricing) + Number(gstTax);
}
