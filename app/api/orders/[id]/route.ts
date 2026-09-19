import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { logActivity } from "@/lib/activity";
import { validationError } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { invoiceTotal, loadOrderHub, STALE_PRODUCTION_FIELDS } from "@/lib/orders/hub";
import { attachLiveProduction } from "@/lib/orders/production";
import { ORDER_POPULATE } from "@/lib/populate";
import { requireAccess } from "@/lib/rbac";
import { serializeOrder } from "@/lib/serialize";
import { orderPatchSchema } from "@/lib/validators/order";
import { Client } from "@/models/Client";
import { Employee } from "@/models/Employee";
import { Order } from "@/models/Order";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAccess("orders", "read");
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
  }

  const hub = await loadOrderHub(auth, id);
  if (!hub) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json(hub);
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAccess("orders", "write");
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = orderPatchSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  await connectDB();

  const existing = await Order.findById(id).lean();
  if (!existing) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (!auth.canAccessClient(String(existing.clientId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined) {
      updates[key] = value;
    }
  }

  if (typeof updates.clientId === "string") {
    if (!mongoose.Types.ObjectId.isValid(updates.clientId)) {
      return NextResponse.json({ error: "Invalid client id" }, { status: 400 });
    }
    if (!auth.canAccessClient(updates.clientId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const client = await Client.findById(updates.clientId).lean();
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }
  }

  if (Array.isArray(updates.assignedEmployeeIds)) {
    const ids = (updates.assignedEmployeeIds as string[]).filter(Boolean);
    if (ids.some((employeeId) => !mongoose.Types.ObjectId.isValid(employeeId))) {
      return NextResponse.json(
        { error: "assignedEmployeeIds must be valid ids" },
        { status: 400 },
      );
    }
    if (ids.length > 0) {
      const employees = await Employee.find({ _id: { $in: ids } }).lean();
      if (employees.length !== ids.length) {
        return NextResponse.json(
          { error: "One or more assigned employees were not found" },
          { status: 400 },
        );
      }
    }
    updates.assignedEmployeeIds = ids;
  }

  const nextPricing =
    typeof updates.pricing === "number"
      ? updates.pricing
      : Number(existing.pricing ?? 0);
  const nextGst =
    typeof updates.gstTax === "number"
      ? updates.gstTax
      : Number(existing.gstTax ?? 0);
  if (updates.pricing !== undefined || updates.gstTax !== undefined) {
    updates.totalInvoiceAmount = invoiceTotal(nextPricing, nextGst);
  }

  if (typeof updates.contractedVideoCount === "number") {
    const completed = Number(existing.completedVideos ?? 0);
    updates.remainingQuota = Math.max(0, updates.contractedVideoCount - completed);
  }

  let order: Record<string, unknown> | null = null;
  try {
    order = (await Order.findByIdAndUpdate(
      id,
      {
        $set: updates,
        $unset: STALE_PRODUCTION_FIELDS,
      },
      { returnDocument: "after", runValidators: true },
    )
      .populate(ORDER_POPULATE)
      .lean()) as Record<string, unknown> | null;
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      const message = Object.values(error.errors)[0]?.message ?? error.message;
      return NextResponse.json({ error: message }, { status: 400 });
    }
    throw error;
  }

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  await logActivity({
    actorId: auth.session.user.id,
    action:
      updates.status && updates.status !== existing.status
        ? "order.status_changed"
        : "order.updated",
    entityType: "Order",
    entityId: id,
    metadata: {
      changes: Object.keys(updates),
      fromStatus: existing.status,
      toStatus: order.status,
    },
  });

  const [withProduction] = await attachLiveProduction([order], auth.byClient());
  return NextResponse.json({ order: serializeOrder(withProduction) });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAccess("orders", "write");
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
  }

  await connectDB();

  const existing = await Order.findById(id).lean();
  if (!existing) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (!auth.canAccessClient(String(existing.clientId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await Order.findByIdAndDelete(id);
  await logActivity({
    actorId: auth.session.user.id,
    action: "order.deleted",
    entityType: "Order",
    entityId: id,
    metadata: { packageName: existing.packageName },
  });

  return NextResponse.json({ ok: true });
}
