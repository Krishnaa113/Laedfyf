import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { logActivity } from "@/lib/activity";
import { validationError } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { isDuplicateKeyError } from "@/lib/mongo-errors";
import { PAYOUT_POPULATE } from "@/lib/populate";
import { requireAccess } from "@/lib/rbac";
import { serializePayout } from "@/lib/serialize";
import { assertPayoutRefs, loadPayoutList } from "@/lib/payouts/hub";
import { payoutInputSchema } from "@/lib/validators/payout";
import { CreatorPayout } from "@/models/CreatorPayout";

export async function GET(request: Request) {
  const auth = await requireAccess("payouts", "read");
  if (!auth.ok) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const creatorId = searchParams.get("creatorId");
  if (creatorId && !mongoose.Types.ObjectId.isValid(creatorId)) {
    return NextResponse.json({ error: "Invalid creator id" }, { status: 400 });
  }

  const payouts = await loadPayoutList(auth, {
    status: searchParams.get("status") ?? undefined,
    creatorId: creatorId ?? undefined,
  });

  return NextResponse.json({ payouts });
}

export async function POST(request: Request) {
  const auth = await requireAccess("payouts", "write");
  if (!auth.ok) {
    return auth.response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = payoutInputSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  if (!mongoose.Types.ObjectId.isValid(parsed.data.creatorId)) {
    return NextResponse.json({ error: "Invalid creator id" }, { status: 400 });
  }
  if (!mongoose.Types.ObjectId.isValid(parsed.data.videoId)) {
    return NextResponse.json({ error: "Invalid video id" }, { status: 400 });
  }

  await connectDB();

  const refs = await assertPayoutRefs({
    creatorId: parsed.data.creatorId,
    orderId: parsed.data.orderId,
    videoId: parsed.data.videoId,
  });
  if (!refs.ok) {
    return NextResponse.json({ error: refs.error }, { status: refs.status });
  }

  const contractedRate = parsed.data.contractedRate;
  const videoCount = parsed.data.videoCount;
  const totalPayout =
    parsed.data.totalPayout ?? Number(contractedRate) * Number(videoCount);

  try {
    const created = await CreatorPayout.create({
      creatorId: parsed.data.creatorId,
      orderId: parsed.data.orderId ?? undefined,
      videoId: parsed.data.videoId,
      videoCount,
      contractedRate,
      totalPayout,
      paymentDate: parsed.data.paymentDate ?? null,
      reference: parsed.data.reference,
      status: parsed.data.status,
    });

    await logActivity({
      actorId: auth.session.user.id,
      action: "payout.created",
      entityType: "CreatorPayout",
      entityId: created._id,
      metadata: { creatorId: parsed.data.creatorId, videoId: parsed.data.videoId },
    });

    const populated = await CreatorPayout.findById(created._id)
      .populate(PAYOUT_POPULATE)
      .lean();

    return NextResponse.json(
      { payout: serializePayout(populated as Record<string, unknown> | null) },
      { status: 201 },
    );
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return NextResponse.json(
        {
          error:
            "This creator has already been paid for this video. Duplicate payouts are blocked.",
        },
        { status: 409 },
      );
    }
    throw error;
  }
}
