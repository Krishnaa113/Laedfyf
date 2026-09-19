import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { logActivity } from "@/lib/activity";
import {
  notifyPaymentRecorded,
  queueNotification,
} from "@/lib/notifications";
import { validationError } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { PAYMENT_POPULATE } from "@/lib/populate";
import { requireAccess } from "@/lib/rbac";
import { serializeOptions, serializePayment } from "@/lib/serialize";
import { assertPaymentRefs, derivePaymentStatus, loadPaymentHub } from "@/lib/payments/hub";
import { paymentPatchSchema } from "@/lib/validators/payment";
import { Payment } from "@/models/Payment";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAccess("payments", "read");
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid payment id" }, { status: 400 });
  }

  const result = await loadPaymentHub(auth, id);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.status === 403 ? "Forbidden" : "Payment not found" },
      { status: result.status },
    );
  }

  return NextResponse.json(result.hub);
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAccess("payments", "write");
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid payment id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = paymentPatchSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  await connectDB();
  const existing = await Payment.findById(id).lean();
  if (!existing) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }
  if (!auth.canAccessClient(String(existing.clientId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const clientId = parsed.data.clientId ?? String(existing.clientId);
  const orderId =
    parsed.data.orderId === undefined
      ? existing.orderId
        ? String(existing.orderId)
        : null
      : parsed.data.orderId;

  if (!mongoose.Types.ObjectId.isValid(clientId)) {
    return NextResponse.json({ error: "Invalid client id" }, { status: 400 });
  }
  if (!auth.canAccessClient(clientId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const refs = await assertPaymentRefs({ clientId, orderId });
  if (!refs.ok) {
    return NextResponse.json({ error: refs.error }, { status: refs.status });
  }

  const invoiceAmount = parsed.data.invoiceAmount ?? Number(existing.invoiceAmount ?? 0);
  const amountReceived =
    parsed.data.amountReceived ?? Number(existing.amountReceived ?? 0);

  const payment = (await Payment.findByIdAndUpdate(
    id,
    {
      $set: {
        clientId,
        orderId,
        invoiceAmount,
        amountReceived,
        paymentDate:
          parsed.data.paymentDate === undefined
            ? existing.paymentDate
            : parsed.data.paymentDate,
        method: parsed.data.method ?? existing.method,
        transactionRef: parsed.data.transactionRef ?? existing.transactionRef,
        notes: parsed.data.notes ?? existing.notes,
        status: derivePaymentStatus(invoiceAmount, amountReceived, parsed.data.status),
      },
    },
    { returnDocument: "after", runValidators: true },
  )
    .populate(PAYMENT_POPULATE)
    .lean()) as Record<string, unknown> | null;

  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  await logActivity({
    actorId: auth.session.user.id,
    action: "payment.updated",
    entityType: "Payment",
    entityId: id,
  });

  if (amountReceived > Number(existing.amountReceived ?? 0)) {
    void queueNotification(
      notifyPaymentRecorded({
        paymentId: id,
        clientId,
        amountReceived,
        actorId: auth.session.user.id,
      }),
    );
  }

  return NextResponse.json({
    payment: serializePayment(payment, serializeOptions(auth.session.user)),
  });
}
