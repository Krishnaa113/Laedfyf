import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { logActivity } from "@/lib/activity";
import { validationError } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { TICKET_POPULATE } from "@/lib/populate";
import { requireAccess } from "@/lib/rbac";
import { serializeOptions, serializeTicket } from "@/lib/serialize";
import { assertTicketRefs, loadTicketList } from "@/lib/tickets/hub";
import { ticketInputSchema } from "@/lib/validators/ticket";
import { SupportTicket } from "@/models/SupportTicket";

export async function GET(request: Request) {
  const auth = await requireAccess("tickets", "read");
  if (!auth.ok) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");
  const orderId = searchParams.get("orderId");

  if (clientId && !mongoose.Types.ObjectId.isValid(clientId)) {
    return NextResponse.json({ error: "Invalid client id" }, { status: 400 });
  }
  if (orderId && !mongoose.Types.ObjectId.isValid(orderId)) {
    return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
  }

  const tickets = await loadTicketList(auth, {
    clientId: clientId ?? undefined,
    orderId: orderId ?? undefined,
    status: searchParams.get("status") ?? undefined,
  });

  return NextResponse.json({ tickets });
}

export async function POST(request: Request) {
  const auth = await requireAccess("tickets", "write");
  if (!auth.ok) {
    return auth.response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = ticketInputSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const isClient = auth.session.user.role === "client";
  const clientId = isClient
    ? auth.session.user.clientId
    : parsed.data.clientId ?? auth.session.user.clientId;

  if (!clientId || !mongoose.Types.ObjectId.isValid(clientId)) {
    return NextResponse.json({ error: "Client is required" }, { status: 400 });
  }
  if (!auth.canAccessClient(clientId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  const refs = await assertTicketRefs({
    clientId,
    orderId: parsed.data.orderId,
  });
  if (!refs.ok) {
    return NextResponse.json({ error: refs.error }, { status: refs.status });
  }

  const created = await SupportTicket.create({
    clientId,
    orderId: parsed.data.orderId ?? null,
    openedById: mongoose.Types.ObjectId.isValid(auth.session.user.id)
      ? auth.session.user.id
      : null,
    subject: parsed.data.subject,
    body: parsed.data.body,
    status: "Open",
  });

  await logActivity({
    actorId: auth.session.user.id,
    action: "ticket.created",
    entityType: "SupportTicket",
    entityId: created._id,
    metadata: { clientId },
  });

  const populated = await SupportTicket.findById(created._id)
    .populate(TICKET_POPULATE)
    .lean();

  return NextResponse.json(
    {
      ticket: serializeTicket(
        populated as Record<string, unknown> | null,
        serializeOptions(auth.session.user),
      ),
    },
    { status: 201 },
  );
}
