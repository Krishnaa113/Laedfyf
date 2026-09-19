import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { logActivity } from "@/lib/activity";
import {
  notifyShootReminder,
  queueNotification,
} from "@/lib/notifications";
import { validationError } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { SHOOT_POPULATE } from "@/lib/populate";
import { requireAccess } from "@/lib/rbac";
import { serializeShoot } from "@/lib/serialize";
import { assertReadyForInProgress } from "@/lib/shoots/checklist";
import {
  assertShootRefs,
  existingIdList,
  loadShootHub,
  nextAssignedId,
  parseDateValue,
  parseOptionalObjectId,
  parseOptionalObjectIdList,
  persistedShootWindow,
  resolvedChecklist,
} from "@/lib/shoots/hub";
import { assertCreatorAvailableForShoot } from "@/lib/shoots/overlap";
import { normalizeShootStatus } from "@/lib/status";
import { shootPatchSchema } from "@/lib/validators/shoot";
import { Shoot } from "@/models/Shoot";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAccess("shoots", "read");
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid shoot id" }, { status: 400 });
  }

  const result = await loadShootHub(auth, id);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.status === 403 ? "Forbidden" : "Shoot not found" },
      { status: result.status },
    );
  }

  return NextResponse.json(result.hub);
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAccess("shoots", "write");
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid shoot id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = shootPatchSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  await connectDB();

  const existing = await Shoot.findById(id).lean();
  if (!existing) {
    return NextResponse.json({ error: "Shoot not found" }, { status: 404 });
  }

  if (!auth.canAccessClient(String(existing.clientId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined && key !== "checklist") {
      updates[key] = value;
    }
  }

  const clientId = parseOptionalObjectId(
    updates.clientId ?? String(existing.clientId),
    "client id",
  );
  if (!clientId.ok || !clientId.value) {
    return NextResponse.json(
      { error: clientId.ok ? "Client is required" : clientId.error },
      { status: 400 },
    );
  }
  if (!auth.canAccessClient(clientId.value)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orderId = parseOptionalObjectId(updates.orderId, "order id");
  const creatorId = parseOptionalObjectId(updates.creatorId, "creator id");
  const cameramanId = parseOptionalObjectId(updates.cameramanId, "cameraman id");
  const shootManagerId = parseOptionalObjectId(
    updates.shootManagerId,
    "shoot manager id",
  );
  const assistantId = parseOptionalObjectId(updates.assistantId, "assistant id");
  const approvedScriptIds = parseOptionalObjectIdList(
    updates.approvedScriptIds,
    "approved script id",
  );
  if (!orderId.ok) {
    return NextResponse.json({ error: orderId.error }, { status: 400 });
  }
  if (!creatorId.ok) {
    return NextResponse.json({ error: creatorId.error }, { status: 400 });
  }
  if (!cameramanId.ok) {
    return NextResponse.json({ error: cameramanId.error }, { status: 400 });
  }
  if (!shootManagerId.ok) {
    return NextResponse.json({ error: shootManagerId.error }, { status: 400 });
  }
  if (!assistantId.ok) {
    return NextResponse.json({ error: assistantId.error }, { status: 400 });
  }
  if (!approvedScriptIds.ok) {
    return NextResponse.json({ error: approvedScriptIds.error }, { status: 400 });
  }

  if (orderId.value !== undefined) {
    updates.orderId = orderId.value;
  }
  if (creatorId.value !== undefined) {
    updates.creatorId = creatorId.value;
  }
  if (cameramanId.value !== undefined) {
    updates.cameramanId = cameramanId.value;
  }
  if (shootManagerId.value !== undefined) {
    updates.shootManagerId = shootManagerId.value;
  }
  if (assistantId.value !== undefined) {
    updates.assistantId = assistantId.value;
  }
  if (approvedScriptIds.value !== undefined) {
    updates.approvedScriptIds = approvedScriptIds.value;
  }

  const nextChecklist = resolvedChecklist(existing.checklist, parsed.data.checklist);
  if (parsed.data.checklist !== undefined) {
    updates.checklist = nextChecklist;
  }

  const currentStatus = normalizeShootStatus(existing.status);
  const nextStatus =
    parsed.data.status !== undefined
      ? normalizeShootStatus(parsed.data.status)
      : currentStatus;

  if (nextStatus === "In Progress" && currentStatus !== "In Progress") {
    const ready = assertReadyForInProgress(nextChecklist);
    if (!ready.ok) {
      return NextResponse.json({ error: ready.error }, { status: ready.status });
    }
  }

  const nextCreatorId = nextAssignedId(creatorId, existing.creatorId);

  const scheduledAt = parseDateValue(
    updates.scheduledAt !== undefined
      ? updates.scheduledAt
      : existing.scheduledAt,
  );
  const endsAt = parseDateValue(
    updates.endsAt !== undefined ? updates.endsAt : existing.endsAt,
  );
  const window = persistedShootWindow(scheduledAt ?? null, endsAt ?? null);
  if (updates.scheduledAt !== undefined || updates.endsAt !== undefined) {
    updates.scheduledAt = window.scheduledAt;
    updates.endsAt = window.endsAt;
  }

  const refs = await assertShootRefs({
    clientId: clientId.value,
    orderId: nextAssignedId(orderId, existing.orderId),
    creatorId: nextCreatorId,
    cameramanId: nextAssignedId(cameramanId, existing.cameramanId),
    shootManagerId: nextAssignedId(shootManagerId, existing.shootManagerId),
    assistantId: nextAssignedId(assistantId, existing.assistantId),
    approvedScriptIds:
      approvedScriptIds.value !== undefined
        ? approvedScriptIds.value
        : existingIdList(existing.approvedScriptIds),
  });
  if (!refs.ok) {
    return NextResponse.json({ error: refs.error }, { status: refs.status });
  }

  updates.clientId = clientId.value;

  const available = await assertCreatorAvailableForShoot({
    creatorId: nextCreatorId,
    scheduledAt: window.scheduledAt,
    endsAt: window.endsAt,
    excludeShootId: id,
  });
  if (!available.ok) {
    return NextResponse.json(
      { error: available.error },
      { status: available.status },
    );
  }

  let shoot: Record<string, unknown> | null = null;
  try {
    shoot = (await Shoot.findByIdAndUpdate(
      id,
      { $set: updates },
      { returnDocument: "after", runValidators: true },
    )
      .populate(SHOOT_POPULATE)
      .lean()) as Record<string, unknown> | null;
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      const message = Object.values(error.errors)[0]?.message ?? error.message;
      return NextResponse.json({ error: message }, { status: 400 });
    }
    throw error;
  }

  if (!shoot) {
    return NextResponse.json({ error: "Shoot not found" }, { status: 404 });
  }

  await logActivity({
    actorId: auth.session.user.id,
    action:
      updates.creatorId && String(updates.creatorId) !== String(existing.creatorId)
        ? "shoot.creator_assigned"
        : "shoot.updated",
    entityType: "Shoot",
    entityId: id,
    metadata: { changes: Object.keys(updates) },
  });

  if (
    window.scheduledAt &&
    window.scheduledAt.getTime() - Date.now() <= 24 * 60 * 60 * 1000 &&
    window.scheduledAt.getTime() >= Date.now() &&
    nextStatus !== "Cancelled" &&
    nextStatus !== "Completed"
  ) {
    void queueNotification(
      notifyShootReminder({
        shootId: id,
        clientId: clientId.value,
        location: String(shoot.location ?? existing.location ?? ""),
        scheduledAt: window.scheduledAt,
        shootManagerId: nextAssignedId(shootManagerId, existing.shootManagerId),
        cameramanId: nextAssignedId(cameramanId, existing.cameramanId),
        assistantId: nextAssignedId(assistantId, existing.assistantId),
      }),
    );
  }

  return NextResponse.json({ shoot: serializeShoot(shoot) });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAccess("shoots", "write");
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid shoot id" }, { status: 400 });
  }

  await connectDB();

  const existing = await Shoot.findById(id).lean();
  if (!existing) {
    return NextResponse.json({ error: "Shoot not found" }, { status: 404 });
  }

  if (!auth.canAccessClient(String(existing.clientId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await Shoot.findByIdAndDelete(id);
  await logActivity({
    actorId: auth.session.user.id,
    action: "shoot.deleted",
    entityType: "Shoot",
    entityId: id,
    metadata: { location: existing.location },
  });

  return NextResponse.json({ ok: true });
}
