import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { logActivity } from "@/lib/activity";
import { validationError } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { invoiceTotal, loadOrderList, STALE_PRODUCTION_FIELDS } from "@/lib/orders/hub";
import { attachLiveProduction } from "@/lib/orders/production";
import { ORDER_POPULATE } from "@/lib/populate";
import { requireAccess } from "@/lib/rbac";
import { serializeOrder } from "@/lib/serialize";
import { orderInputSchema } from "@/lib/validators/order";
import { Client } from "@/models/Client";
import { Employee } from "@/models/Employee";
import { Order } from "@/models/Order";

export async function GET(request: Request) {
  const auth = await requireAccess("orders", "read");
  if (!auth.ok) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");

  if (clientId && !mongoose.Types.ObjectId.isValid(clientId)) {
    return NextResponse.json({ error: "Invalid client id" }, { status: 400 });
  }

  const orders = await loadOrderList(auth, {
    clientId: clientId ?? undefined,
    q: searchParams.get("q") ?? undefined,
    status: searchParams.get("status") ?? undefined,
  });

  return NextResponse.json({ orders });
}

export async function POST(request: Request) {
  const auth = await requireAccess("orders", "write");
  if (!auth.ok) {
    return auth.response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = orderInputSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  if (!mongoose.Types.ObjectId.isValid(parsed.data.clientId)) {
    return NextResponse.json({ error: "Invalid client id" }, { status: 400 });
  }

  if (!auth.canAccessClient(parsed.data.clientId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const assignedEmployeeIds = parsed.data.assignedEmployeeIds.filter((id) =>
    mongoose.Types.ObjectId.isValid(id),
  );
  if (assignedEmployeeIds.length !== parsed.data.assignedEmployeeIds.length) {
    return NextResponse.json(
      { error: "assignedEmployeeIds must be valid ids" },
      { status: 400 },
    );
  }

  await connectDB();

  const client = await Client.findById(parsed.data.clientId).lean();
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  if (assignedEmployeeIds.length > 0) {
    const employees = await Employee.find({
      _id: { $in: assignedEmployeeIds },
    }).lean();
    if (employees.length !== assignedEmployeeIds.length) {
      return NextResponse.json(
        { error: "One or more assigned employees were not found" },
        { status: 400 },
      );
    }
  }

  const totalInvoiceAmount = invoiceTotal(parsed.data.pricing, parsed.data.gstTax);

  const created = await Order.create({
    clientId: parsed.data.clientId,
    packageName: parsed.data.packageName,
    contractedVideoCount: parsed.data.contractedVideoCount,
    pricing: parsed.data.pricing,
    gstTax: parsed.data.gstTax,
    totalInvoiceAmount,
    amountReceived: parsed.data.amountReceived,
    status: parsed.data.status,
    assignedEmployeeIds,
    completedVideos: 0,
    remainingQuota: parsed.data.contractedVideoCount,
    startDate: parsed.data.startDate ?? null,
    dueDate: parsed.data.dueDate ?? null,
  });

  await Order.updateOne(
    { _id: created._id },
    { $unset: STALE_PRODUCTION_FIELDS },
  );

  await logActivity({
    actorId: auth.session.user.id,
    action: "order.created",
    entityType: "Order",
    entityId: created._id,
    metadata: {
      clientId: parsed.data.clientId,
      packageName: parsed.data.packageName,
    },
  });

  const populated = await Order.findById(created._id).populate(ORDER_POPULATE).lean();
  const [withProduction] = await attachLiveProduction(
    populated ? [populated] : [],
    auth.byClient(),
  );

  return NextResponse.json(
    { order: serializeOrder(withProduction) },
    { status: 201 },
  );
}
