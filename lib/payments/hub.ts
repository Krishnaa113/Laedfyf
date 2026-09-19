import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { PAYMENT_POPULATE } from "@/lib/populate";
import type { AuthOk } from "@/lib/rbac";
import {
  serializeOptions,
  serializePayment,
  type SerializedPayment,
} from "@/lib/serialize";
import { normalizePaymentStatus } from "@/lib/status";
import { Client } from "@/models/Client";
import { Order } from "@/models/Order";
import { Payment } from "@/models/Payment";
import { User } from "@/models/User";
import { derivePaymentStatus } from "@/lib/payments/status";

void User;

export { derivePaymentStatus };

export async function loadPaymentList(
  auth: AuthOk,
  query: { clientId?: string; orderId?: string; status?: string } = {},
) {
  await connectDB();

  const filter: Record<string, unknown> = {};
  if (query.clientId) {
    filter.clientId = new mongoose.Types.ObjectId(query.clientId);
  }
  if (query.orderId) {
    filter.orderId = new mongoose.Types.ObjectId(query.orderId);
  }
  if (query.status) {
    filter.status = normalizePaymentStatus(query.status);
  }

  const docs = await Payment.find(auth.byClient(filter))
    .populate(PAYMENT_POPULATE)
    .sort({ createdAt: -1 })
    .lean();

  const options = serializeOptions(auth.session.user);
  return docs
    .map((doc) => serializePayment(doc, options))
    .filter((payment): payment is SerializedPayment => Boolean(payment));
}

export async function loadPaymentHub(auth: AuthOk, paymentId: string) {
  await connectDB();

  const doc = await Payment.findById(paymentId).populate(PAYMENT_POPULATE).lean();
  if (!doc) {
    return { ok: false as const, status: 404 as const };
  }

  const clientId = String(doc.clientId ?? "");
  if (!auth.canAccessClient(clientId)) {
    return { ok: false as const, status: 403 as const };
  }

  const payment = serializePayment(
    doc as Record<string, unknown>,
    serializeOptions(auth.session.user),
  );
  if (!payment) {
    return { ok: false as const, status: 404 as const };
  }

  return { ok: true as const, hub: { payment } };
}

export async function assertPaymentRefs(input: {
  clientId: string;
  orderId?: string | null;
}): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const client = await Client.findById(input.clientId).lean();
  if (!client) {
    return { ok: false, status: 404, error: "Client not found" };
  }

  if (input.orderId) {
    const order = await Order.findById(input.orderId).lean();
    if (!order) {
      return { ok: false, status: 404, error: "Order not found" };
    }
    if (String(order.clientId) !== input.clientId) {
      return { ok: false, status: 400, error: "Order does not belong to this client" };
    }
  }

  return { ok: true };
}
