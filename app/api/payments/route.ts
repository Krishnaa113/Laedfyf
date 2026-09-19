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
import {
  assertPaymentRefs,
  derivePaymentStatus,
  loadPaymentList,
} from "@/lib/payments/hub";
import { paymentInputSchema } from "@/lib/validators/payment";
import { Payment } from "@/models/Payment";

export async function GET(request: Request) {
  const auth = await requireAccess("payments", "read");
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

  const payments = await loadPaymentList(auth, {
    clientId: clientId ?? undefined,
    orderId: orderId ?? undefined,
    status: searchParams.get("status") ?? undefined,
  });

  return NextResponse.json({ payments });
}

export async function POST(request: Request) {
  const auth = await requireAccess("payments", "write");
  if (!auth.ok) {
    return auth.response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = paymentInputSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  if (!mongoose.Types.ObjectId.isValid(parsed.data.clientId)) {
    return NextResponse.json({ error: "Invalid client id" }, { status: 400 });
  }
  if (!auth.canAccessClient(parsed.data.clientId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  const refs = await assertPaymentRefs({
    clientId: parsed.data.clientId,
    orderId: parsed.data.orderId,
  });
  if (!refs.ok) {
    return NextResponse.json({ error: refs.error }, { status: refs.status });
  }

  const created = await Payment.create({
    clientId: parsed.data.clientId,
    orderId: parsed.data.orderId ?? undefined,
    invoiceAmount: parsed.data.invoiceAmount,
    amountReceived: parsed.data.amountReceived,
    paymentDate: parsed.data.paymentDate ?? null,
    method: parsed.data.method,
    transactionRef: parsed.data.transactionRef,
    notes: parsed.data.notes,
    status: derivePaymentStatus(
      parsed.data.invoiceAmount,
      parsed.data.amountReceived,
      parsed.data.status,
    ),
  });

  await logActivity({
    actorId: auth.session.user.id,
    action: "payment.created",
    entityType: "Payment",
    entityId: created._id,
    metadata: { clientId: parsed.data.clientId },
  });

  if (parsed.data.amountReceived > 0) {
    void queueNotification(
      notifyPaymentRecorded({
        paymentId: String(created._id),
        clientId: parsed.data.clientId,
        amountReceived: parsed.data.amountReceived,
        actorId: auth.session.user.id,
      }),
    );
  }

  const populated = await Payment.findById(created._id)
    .populate(PAYMENT_POPULATE)
    .lean();

  return NextResponse.json(
    {
      payment: serializePayment(
        populated as Record<string, unknown> | null,
        serializeOptions(auth.session.user),
      ),
    },
    { status: 201 },
  );
}
