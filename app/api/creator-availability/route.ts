import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { logActivity } from "@/lib/activity";
import { validationError } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import {
  assertCreatorExists,
  loadCreatorAvailabilityList,
} from "@/lib/creators/availability";
import { findBlockingAvailability } from "@/lib/shoots/overlap";
import { requireAccess } from "@/lib/rbac";
import { serializeCreatorAvailability } from "@/lib/serialize";
import { creatorAvailabilityInputSchema } from "@/lib/validators/creator-availability";
import { CreatorAvailability } from "@/models/CreatorAvailability";

export async function GET(request: Request) {
  const auth = await requireAccess("creator-availability", "read");
  if (!auth.ok) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const creatorId = searchParams.get("creatorId");
  if (creatorId && !mongoose.Types.ObjectId.isValid(creatorId)) {
    return NextResponse.json({ error: "Invalid creator id" }, { status: 400 });
  }

  const windows = await loadCreatorAvailabilityList(creatorId ?? undefined);
  return NextResponse.json({ windows });
}

export async function POST(request: Request) {
  const auth = await requireAccess("creator-availability", "write");
  if (!auth.ok) {
    return auth.response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = creatorAvailabilityInputSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error);
  }
  if (!mongoose.Types.ObjectId.isValid(parsed.data.creatorId)) {
    return NextResponse.json({ error: "Invalid creator id" }, { status: 400 });
  }

  await connectDB();
  const exists = await assertCreatorExists(parsed.data.creatorId);
  if (!exists.ok) {
    return NextResponse.json({ error: exists.error }, { status: exists.status });
  }

  if (parsed.data.status !== "Available") {
    const blocked = await findBlockingAvailability({
      creatorId: parsed.data.creatorId,
      scheduledAt: new Date(parsed.data.startsAt),
      endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
    });
    if (blocked) {
      return NextResponse.json(
        { error: "This window overlaps another unavailable block" },
        { status: 409 },
      );
    }
  }

  const created = await CreatorAvailability.create({
    creatorId: parsed.data.creatorId,
    shootId: parsed.data.shootId,
    startsAt: parsed.data.startsAt,
    endsAt: parsed.data.endsAt,
    status: parsed.data.status,
    notes: parsed.data.notes,
  });

  await logActivity({
    actorId: auth.session.user.id,
    action: "creator_availability.created",
    entityType: "CreatorAvailability",
    entityId: created._id,
    metadata: { creatorId: parsed.data.creatorId },
  });

  return NextResponse.json(
    { window: serializeCreatorAvailability(created.toObject()) },
    { status: 201 },
  );
}
