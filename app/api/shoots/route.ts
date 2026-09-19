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
  loadShootList,
  parseDateValue,
  parseOptionalObjectId,
  parseOptionalObjectIdList,
  parseRangeBound,
  persistedShootWindow,
  resolvedChecklist,
} from "@/lib/shoots/hub";
import { assertCreatorAvailableForShoot } from "@/lib/shoots/overlap";
import { shootInputSchema } from "@/lib/validators/shoot";
import { Shoot } from "@/models/Shoot";

export async function GET(request: Request) {
  const auth = await requireAccess("shoots", "read");
  if (!auth.ok) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");
  const creatorId = searchParams.get("creatorId");

  if (clientId && !mongoose.Types.ObjectId.isValid(clientId)) {
    return NextResponse.json({ error: "Invalid client id" }, { status: 400 });
  }
  if (creatorId && !mongoose.Types.ObjectId.isValid(creatorId)) {
    return NextResponse.json({ error: "Invalid creator id" }, { status: 400 });
  }

  const from = parseRangeBound(searchParams.get("from"), "from");
  const to = parseRangeBound(searchParams.get("to"), "to");
  if (!from.ok) {
    return NextResponse.json({ error: from.error }, { status: 400 });
  }
  if (!to.ok) {
    return NextResponse.json({ error: to.error }, { status: 400 });
  }

  const shoots = await loadShootList(auth, {
    clientId: clientId ?? undefined,
    creatorId: creatorId ?? undefined,
    q: searchParams.get("q") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    from: from.value,
    to: to.value,
  });

  return NextResponse.json({ shoots });
}

export async function POST(request: Request) {
  const auth = await requireAccess("shoots", "write");
  if (!auth.ok) {
    return auth.response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = shootInputSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  if (!mongoose.Types.ObjectId.isValid(parsed.data.clientId)) {
    return NextResponse.json({ error: "Invalid client id" }, { status: 400 });
  }

  if (!auth.canAccessClient(parsed.data.clientId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orderId = parseOptionalObjectId(parsed.data.orderId, "order id");
  const creatorId = parseOptionalObjectId(parsed.data.creatorId, "creator id");
  const cameramanId = parseOptionalObjectId(parsed.data.cameramanId, "cameraman id");
  const shootManagerId = parseOptionalObjectId(
    parsed.data.shootManagerId,
    "shoot manager id",
  );
  const assistantId = parseOptionalObjectId(parsed.data.assistantId, "assistant id");
  const approvedScriptIds = parseOptionalObjectIdList(
    parsed.data.approvedScriptIds,
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

  const scheduledAt = parseDateValue(parsed.data.scheduledAt) ?? null;
  const endsAt = parseDateValue(parsed.data.endsAt) ?? null;
  const window = persistedShootWindow(scheduledAt, endsAt);
  const checklist = resolvedChecklist(undefined, parsed.data.checklist);

  if (parsed.data.status === "In Progress") {
    const ready = assertReadyForInProgress(checklist);
    if (!ready.ok) {
      return NextResponse.json({ error: ready.error }, { status: ready.status });
    }
  }

  await connectDB();

  const refs = await assertShootRefs({
    clientId: parsed.data.clientId,
    orderId: orderId.value,
    creatorId: creatorId.value,
    cameramanId: cameramanId.value,
    shootManagerId: shootManagerId.value,
    assistantId: assistantId.value,
    approvedScriptIds: approvedScriptIds.value,
  });
  if (!refs.ok) {
    return NextResponse.json({ error: refs.error }, { status: refs.status });
  }

  const available = await assertCreatorAvailableForShoot({
    creatorId: creatorId.value,
    scheduledAt: window.scheduledAt,
    endsAt: window.endsAt,
  });
  if (!available.ok) {
    return NextResponse.json(
      { error: available.error },
      { status: available.status },
    );
  }

  const created = await Shoot.create({
    clientId: parsed.data.clientId,
    orderId: orderId.value ?? undefined,
    creatorId: creatorId.value ?? undefined,
    cameramanId: cameramanId.value ?? undefined,
    shootManagerId: shootManagerId.value ?? undefined,
    assistantId: assistantId.value ?? undefined,
    approvedScriptIds: approvedScriptIds.value ?? [],
    location: parsed.data.location,
    scheduledAt: window.scheduledAt,
    endsAt: window.endsAt,
    status: parsed.data.status,
    notes: parsed.data.notes,
    checklist,
  });

  await logActivity({
    actorId: auth.session.user.id,
    action: "shoot.created",
    entityType: "Shoot",
    entityId: created._id,
    metadata: {
      clientId: parsed.data.clientId,
      creatorId: creatorId.value ?? null,
    },
  });

  if (
    window.scheduledAt &&
    window.scheduledAt.getTime() - Date.now() <= 24 * 60 * 60 * 1000 &&
    window.scheduledAt.getTime() >= Date.now()
  ) {
    void queueNotification(
      notifyShootReminder({
        shootId: String(created._id),
        clientId: parsed.data.clientId,
        location: parsed.data.location,
        scheduledAt: window.scheduledAt,
        shootManagerId: shootManagerId.value ?? null,
        cameramanId: cameramanId.value ?? null,
        assistantId: assistantId.value ?? null,
      }),
    );
  }

  const populated = await Shoot.findById(created._id)
    .populate(SHOOT_POPULATE)
    .lean();

  return NextResponse.json(
    { shoot: serializeShoot(populated as Record<string, unknown> | null) },
    { status: 201 },
  );
}
