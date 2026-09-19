import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { logActivity } from "@/lib/activity";
import {
  notifyScriptApproved,
  notifyScriptAssigned,
  notifyScriptRevision,
  queueNotification,
} from "@/lib/notifications";
import { validationError } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { SCRIPT_POPULATE } from "@/lib/populate";
import { requireAccess } from "@/lib/rbac";
import { serializeScript } from "@/lib/serialize";
import {
  assertScriptRefs,
  extractClientId,
  loadScriptHub,
  parseOptionalObjectId,
} from "@/lib/scripts/hub";
import { scriptPatchSchema } from "@/lib/validators/script";
import { Script } from "@/models/Script";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAccess("scripts", "read");
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid script id" }, { status: 400 });
  }

  const result = await loadScriptHub(auth, id);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.status === 403 ? "Forbidden" : "Script not found" },
      { status: result.status },
    );
  }

  return NextResponse.json(result.hub);
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAccess("scripts", "write");
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid script id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = scriptPatchSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  await connectDB();

  const existing = await Script.findById(id).lean();
  if (!existing) {
    return NextResponse.json({ error: "Script not found" }, { status: 404 });
  }

  if (!auth.canAccessClient(extractClientId(existing as Record<string, unknown>))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined) {
      updates[key] = value;
    }
  }

  const nextClientId = parseOptionalObjectId(
    updates.clientId ?? String(existing.clientId),
    "client id",
  );
  if (!nextClientId.ok || !nextClientId.value) {
    return NextResponse.json(
      { error: nextClientId.ok ? "Client is required" : nextClientId.error },
      { status: 400 },
    );
  }
  if (!auth.canAccessClient(nextClientId.value)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orderId = parseOptionalObjectId(updates.orderId, "order id");
  const writerId = parseOptionalObjectId(updates.writerId, "writer id");
  const creatorId = parseOptionalObjectId(updates.creatorId, "creator id");
  if (!orderId.ok) {
    return NextResponse.json({ error: orderId.error }, { status: 400 });
  }
  if (!writerId.ok) {
    return NextResponse.json({ error: writerId.error }, { status: 400 });
  }
  if (!creatorId.ok) {
    return NextResponse.json({ error: creatorId.error }, { status: 400 });
  }

  if (orderId.value !== undefined) {
    updates.orderId = orderId.value;
  }
  if (writerId.value !== undefined) {
    updates.writerId = writerId.value;
  }
  if (creatorId.value !== undefined) {
    updates.creatorId = creatorId.value;
  }
  if (Array.isArray(updates.referenceLinks)) {
    updates.referenceLinks = (updates.referenceLinks as string[]).filter(Boolean);
  }

  const refs = await assertScriptRefs({
    clientId: nextClientId.value,
    orderId:
      orderId.value !== undefined
        ? orderId.value
        : existing.orderId
          ? String(existing.orderId)
          : null,
    writerId:
      writerId.value !== undefined
        ? writerId.value
        : existing.writerId
          ? String(existing.writerId)
          : null,
    creatorId:
      creatorId.value !== undefined
        ? creatorId.value
        : existing.creatorId
          ? String(existing.creatorId)
          : null,
  });
  if (!refs.ok) {
    return NextResponse.json({ error: refs.error }, { status: refs.status });
  }

  updates.clientId = nextClientId.value;

  let script: Record<string, unknown> | null = null;
  try {
    script = (await Script.findByIdAndUpdate(
      id,
      { $set: updates },
      { returnDocument: "after", runValidators: true },
    )
      .populate(SCRIPT_POPULATE)
      .lean()) as Record<string, unknown> | null;
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      const message = Object.values(error.errors)[0]?.message ?? error.message;
      return NextResponse.json({ error: message }, { status: 400 });
    }
    throw error;
  }

  if (!script) {
    return NextResponse.json({ error: "Script not found" }, { status: 404 });
  }

  await logActivity({
    actorId: auth.session.user.id,
    action:
      updates.status && updates.status !== existing.status
        ? "script.status_changed"
        : "script.updated",
    entityType: "Script",
    entityId: id,
    metadata: {
      changes: Object.keys(updates),
      fromStatus: existing.status,
      toStatus: script.status,
    },
  });

  const nextWriterId =
    writerId.value !== undefined
      ? writerId.value
      : existing.writerId
        ? String(existing.writerId)
        : null;
  const previousWriterId = existing.writerId ? String(existing.writerId) : null;
  if (nextWriterId && nextWriterId !== previousWriterId) {
    void queueNotification(
      notifyScriptAssigned({
        scriptId: id,
        clientId: nextClientId.value,
        writerId: nextWriterId,
        videoNumber: Number(script.videoNumber ?? existing.videoNumber ?? 0) || null,
        actorId: auth.session.user.id,
      }),
    );
  }

  const nextStatus = String(script.status ?? "");
  const previousStatus = String(existing.status ?? "");
  if (nextStatus === "Approved" && previousStatus !== "Approved") {
    void queueNotification(
      notifyScriptApproved({
        scriptId: id,
        clientId: nextClientId.value,
        writerId: nextWriterId,
        videoNumber: Number(script.videoNumber ?? existing.videoNumber ?? 0) || null,
        actorId: auth.session.user.id,
      }),
    );
  }
  if (
    nextStatus === "Revision Required" &&
    previousStatus !== "Revision Required"
  ) {
    void queueNotification(
      notifyScriptRevision({
        scriptId: id,
        clientId: nextClientId.value,
        writerId: nextWriterId,
        videoNumber: Number(script.videoNumber ?? existing.videoNumber ?? 0) || null,
        actorId: auth.session.user.id,
      }),
    );
  }

  return NextResponse.json({ script: serializeScript(script) });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAccess("scripts", "write");
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid script id" }, { status: 400 });
  }

  await connectDB();

  const existing = await Script.findById(id).lean();
  if (!existing) {
    return NextResponse.json({ error: "Script not found" }, { status: 404 });
  }

  if (!auth.canAccessClient(extractClientId(existing as Record<string, unknown>))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await Script.findByIdAndDelete(id);
  await logActivity({
    actorId: auth.session.user.id,
    action: "script.deleted",
    entityType: "Script",
    entityId: id,
    metadata: { videoNumber: existing.videoNumber },
  });

  return NextResponse.json({ ok: true });
}
