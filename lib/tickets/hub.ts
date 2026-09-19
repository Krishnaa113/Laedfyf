import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { TICKET_POPULATE } from "@/lib/populate";
import type { AuthOk } from "@/lib/rbac";
import {
  serializeOptions,
  serializeTicket,
  type SerializedTicket,
} from "@/lib/serialize";
import { normalizeTicketStatus } from "@/lib/status";
import { Client } from "@/models/Client";
import { Employee } from "@/models/Employee";
import { Order } from "@/models/Order";
import { SupportTicket } from "@/models/SupportTicket";
import { User } from "@/models/User";

void Employee;
void User;

export async function loadTicketList(
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
    filter.status = normalizeTicketStatus(query.status);
  }

  const docs = await SupportTicket.find(auth.byClient(filter))
    .populate(TICKET_POPULATE)
    .sort({ createdAt: -1 })
    .lean();

  const options = serializeOptions(auth.session.user);
  return docs
    .map((doc) => serializeTicket(doc, options))
    .filter((ticket): ticket is SerializedTicket => Boolean(ticket));
}

export async function loadTicketHub(auth: AuthOk, ticketId: string) {
  await connectDB();

  const doc = await SupportTicket.findById(ticketId)
    .populate(TICKET_POPULATE)
    .lean();
  if (!doc) {
    return { ok: false as const, status: 404 as const };
  }

  const clientId = String(doc.clientId ?? "");
  if (!auth.canAccessClient(clientId)) {
    return { ok: false as const, status: 403 as const };
  }

  const ticket = serializeTicket(
    doc as Record<string, unknown>,
    serializeOptions(auth.session.user),
  );
  if (!ticket) {
    return { ok: false as const, status: 404 as const };
  }

  return { ok: true as const, hub: { ticket } };
}

export async function assertTicketRefs(input: {
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
