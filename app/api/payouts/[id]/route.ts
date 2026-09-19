import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { logActivity } from "@/lib/activity";
import { validationError } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { PAYOUT_POPULATE } from "@/lib/populate";
import { requireAccess } from "@/lib/rbac";
import { serializePayout } from "@/lib/serialize";
import { loadPayoutHub } from "@/lib/payouts/hub";
import { payoutPatchSchema } from "@/lib/validators/payout";
import { CreatorPayout } from "@/models/CreatorPayout";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAccess("payouts", "read");
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid payout id" }, { status: 400 });
  }

  const result = await loadPayoutHub(auth, id);
  if (!result.ok) {
    return NextResponse.json({ error: "Payout not found" }, { status: result.status });
  }

  return NextResponse.json(result.hub);
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAccess("payouts", "write");
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid payout id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = payoutPatchSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  await connectDB();
  const existing = await CreatorPayout.findById(id).lean();
  if (!existing) {
    return NextResponse.json({ error: "Payout not found" }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined) {
      updates[key] = value;
    }
  }
  if (
    parsed.data.contractedRate !== undefined ||
    parsed.data.videoCount !== undefined
  ) {
    const rate = parsed.data.contractedRate ?? Number(existing.contractedRate ?? 0);
    const count = parsed.data.videoCount ?? Number(existing.videoCount ?? 1);
    if (parsed.data.totalPayout === undefined) {
      updates.totalPayout = rate * count;
    }
  }

  const payout = (await CreatorPayout.findByIdAndUpdate(
    id,
    { $set: updates },
    { returnDocument: "after", runValidators: true },
  )
    .populate(PAYOUT_POPULATE)
    .lean()) as Record<string, unknown> | null;

  if (!payout) {
    return NextResponse.json({ error: "Payout not found" }, { status: 404 });
  }

  await logActivity({
    actorId: auth.session.user.id,
    action: "payout.updated",
    entityType: "CreatorPayout",
    entityId: id,
  });

  return NextResponse.json({ payout: serializePayout(payout) });
}
