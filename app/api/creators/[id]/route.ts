import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { logActivity } from "@/lib/activity";
import { validationError } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { loadCreatorHub } from "@/lib/creators/hub";
import { canAccess, requireAccess } from "@/lib/rbac";
import { serializeCreator } from "@/lib/serialize";
import { creatorPatchSchema } from "@/lib/validators/creator";
import { Creator } from "@/models/Creator";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAccess("creators", "read");
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid creator id" }, { status: 400 });
  }

  const includePayout = canAccess(auth.session.user, "creators", "read");
  const hub = await loadCreatorHub(id, { includePayout });
  if (!hub) {
    return NextResponse.json({ error: "Creator not found" }, { status: 404 });
  }

  return NextResponse.json(hub);
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAccess("creators", "write");
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid creator id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = creatorPatchSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  await connectDB();

  const updates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined) {
      updates[key] = Array.isArray(value)
        ? (value as string[]).filter(Boolean)
        : value;
    }
  }

  let creator: Record<string, unknown> | null = null;
  try {
    creator = (await Creator.findByIdAndUpdate(
      id,
      { $set: updates },
      { returnDocument: "after", runValidators: true },
    ).lean()) as Record<string, unknown> | null;
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      const message = Object.values(error.errors)[0]?.message ?? error.message;
      return NextResponse.json({ error: message }, { status: 400 });
    }
    throw error;
  }

  if (!creator) {
    return NextResponse.json({ error: "Creator not found" }, { status: 404 });
  }

  await logActivity({
    actorId: auth.session.user.id,
    action: "creator.updated",
    entityType: "Creator",
    entityId: id,
    metadata: { changes: Object.keys(updates) },
  });

  return NextResponse.json({
    creator: serializeCreator(creator, { includePayout: true }),
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAccess("creators", "write");
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid creator id" }, { status: 400 });
  }

  await connectDB();

  const existing = await Creator.findById(id).lean();
  if (!existing) {
    return NextResponse.json({ error: "Creator not found" }, { status: 404 });
  }

  await Creator.findByIdAndDelete(id);
  await logActivity({
    actorId: auth.session.user.id,
    action: "creator.deleted",
    entityType: "Creator",
    entityId: id,
    metadata: { name: existing.name },
  });

  return NextResponse.json({ ok: true });
}
