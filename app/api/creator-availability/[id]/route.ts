import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { logActivity } from "@/lib/activity";
import { validationError } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { findBlockingAvailability } from "@/lib/shoots/overlap";
import { requireAccess } from "@/lib/rbac";
import { serializeCreatorAvailability } from "@/lib/serialize";
import { creatorAvailabilityPatchSchema } from "@/lib/validators/creator-availability";
import { CreatorAvailability } from "@/models/CreatorAvailability";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAccess("creator-availability", "write");
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid availability id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = creatorAvailabilityPatchSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  await connectDB();
  const existing = await CreatorAvailability.findById(id).lean();
  if (!existing) {
    return NextResponse.json({ error: "Availability window not found" }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined) {
      updates[key] = value;
    }
  }

  const nextStart = updates.startsAt
    ? new Date(String(updates.startsAt))
    : existing.startsAt
      ? new Date(String(existing.startsAt))
      : null;
  const nextEnd =
    updates.endsAt !== undefined
      ? updates.endsAt
        ? new Date(String(updates.endsAt))
        : null
      : existing.endsAt
        ? new Date(String(existing.endsAt))
        : null;
  const nextStatus = String(updates.status ?? existing.status);
  const creatorId = String(updates.creatorId ?? existing.creatorId);

  if (nextStart && nextStatus !== "Available") {
    const blocked = await findBlockingAvailability({
      creatorId,
      scheduledAt: nextStart,
      endsAt: nextEnd,
      excludeId: id,
    });
    if (blocked) {
      return NextResponse.json(
        { error: "This window overlaps another unavailable block" },
        { status: 409 },
      );
    }
  }

  const window = (await CreatorAvailability.findByIdAndUpdate(
    id,
    { $set: updates },
    { returnDocument: "after", runValidators: true },
  ).lean()) as Record<string, unknown> | null;

  if (!window) {
    return NextResponse.json({ error: "Availability window not found" }, { status: 404 });
  }

  await logActivity({
    actorId: auth.session.user.id,
    action: "creator_availability.updated",
    entityType: "CreatorAvailability",
    entityId: id,
  });

  return NextResponse.json({ window: serializeCreatorAvailability(window) });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAccess("creator-availability", "write");
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid availability id" }, { status: 400 });
  }

  await connectDB();
  const existing = await CreatorAvailability.findByIdAndDelete(id).lean();
  if (!existing) {
    return NextResponse.json({ error: "Availability window not found" }, { status: 404 });
  }

  await logActivity({
    actorId: auth.session.user.id,
    action: "creator_availability.deleted",
    entityType: "CreatorAvailability",
    entityId: id,
  });

  return NextResponse.json({ ok: true });
}
