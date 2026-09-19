import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { logActivity } from "@/lib/activity";
import { validationError } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { TICKET_POPULATE } from "@/lib/populate";
import { isInternalRole } from "@/lib/roles";
import { requireAccess } from "@/lib/rbac";
import { serializeOptions, serializeTicket } from "@/lib/serialize";
import { loadTicketHub } from "@/lib/tickets/hub";
import { ticketPatchSchema } from "@/lib/validators/ticket";
import { SupportTicket } from "@/models/SupportTicket";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAccess("tickets", "read");
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid ticket id" }, { status: 400 });
  }

  const result = await loadTicketHub(auth, id);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.status === 403 ? "Forbidden" : "Ticket not found" },
      { status: result.status },
    );
  }

  return NextResponse.json(result.hub);
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAccess("tickets", "write");
  if (!auth.ok) {
    return auth.response;
  }

  if (!isInternalRole(auth.session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid ticket id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = ticketPatchSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  await connectDB();

  const existing = await SupportTicket.findById(id).lean();
  if (!existing) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }
  if (!auth.canAccessClient(String(existing.clientId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.subject !== undefined) {
    updates.subject = parsed.data.subject;
  }
  if (parsed.data.body !== undefined) {
    updates.body = parsed.data.body;
  }
  if (parsed.data.status !== undefined) {
    updates.status = parsed.data.status;
  }
  if (parsed.data.assignedEmployeeId !== undefined) {
    updates.assignedEmployeeId = parsed.data.assignedEmployeeId;
  }

  const ticket = (await SupportTicket.findByIdAndUpdate(id, { $set: updates }, {
    returnDocument: "after",
    runValidators: true,
  })
    .populate(TICKET_POPULATE)
    .lean()) as Record<string, unknown> | null;

  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  await logActivity({
    actorId: auth.session.user.id,
    action: "ticket.updated",
    entityType: "SupportTicket",
    entityId: id,
  });

  return NextResponse.json({
    ticket: serializeTicket(ticket, serializeOptions(auth.session.user)),
  });
}
