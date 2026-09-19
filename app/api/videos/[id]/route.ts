import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { logActivity } from "@/lib/activity";
import {
  notifyFinalVideoApproved,
  notifyVideoAssignedToEditor,
  queueNotification,
} from "@/lib/notifications";
import { validationError } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { VIDEO_POPULATE } from "@/lib/populate";
import { requireAccess } from "@/lib/rbac";
import { serializeVideo } from "@/lib/serialize";
import { normalizeVideoStatus } from "@/lib/status";
import { DeliveryError, deliverVideoInTransaction } from "@/lib/videos/delivery";
import {
  assertVideoRefs,
  extractClientId,
  loadVideoHub,
  parseDateValue,
  parseOptionalObjectId,
} from "@/lib/videos/hub";
import { videoPatchSchema } from "@/lib/validators/video";
import { Video } from "@/models/Video";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAccess("videos", "read");
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid video id" }, { status: 400 });
  }

  const result = await loadVideoHub(auth, id);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.status === 403 ? "Forbidden" : "Video not found" },
      { status: result.status },
    );
  }

  return NextResponse.json(result.hub);
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAccess("videos", "write");
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid video id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = videoPatchSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  await connectDB();

  const existing = await Video.findById(id).lean();
  if (!existing) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  if (!auth.canAccessClient(extractClientId(existing as Record<string, unknown>))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const currentStatus = normalizeVideoStatus(existing.status);
  const nextStatus =
    parsed.data.status !== undefined
      ? normalizeVideoStatus(parsed.data.status)
      : currentStatus;

  if (nextStatus === "Delivered" && currentStatus !== "Delivered") {
    try {
      const delivered = await deliverVideoInTransaction({
        videoId: id,
        finalDeliveryLink:
          parsed.data.finalDeliveryLink ??
          String(existing.finalDeliveryLink ?? existing.fileLink ?? ""),
      });
      await logActivity({
        actorId: auth.session.user.id,
        action: "video.delivered",
        entityType: "Video",
        entityId: id,
        metadata: { via: "internal" },
      });
      return NextResponse.json({ video: delivered.video });
    } catch (error) {
      if (error instanceof DeliveryError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }
      throw error;
    }
  }

  const updates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined && key !== "assignedEditorId" && key !== "editorId") {
      updates[key] = value;
    }
  }

  const clientId = parseOptionalObjectId(
    updates.clientId ?? String(existing.clientId),
    "client id",
  );
  const orderId = parseOptionalObjectId(
    updates.orderId ?? String(existing.orderId),
    "order id",
  );
  const scriptId = parseOptionalObjectId(parsed.data.scriptId, "script id");
  const creatorId = parseOptionalObjectId(parsed.data.creatorId, "creator id");
  const shootId = parseOptionalObjectId(parsed.data.shootId, "shoot id");
  const editorId = parseOptionalObjectId(
    parsed.data.assignedEditorId ?? parsed.data.editorId,
    "editor id",
  );

  if (!clientId.ok || !clientId.value) {
    return NextResponse.json(
      { error: clientId.ok ? "Client is required" : clientId.error },
      { status: 400 },
    );
  }
  if (!orderId.ok || !orderId.value) {
    return NextResponse.json(
      { error: orderId.ok ? "Order is required" : orderId.error },
      { status: 400 },
    );
  }
  if (!scriptId.ok) {
    return NextResponse.json({ error: scriptId.error }, { status: 400 });
  }
  if (!creatorId.ok) {
    return NextResponse.json({ error: creatorId.error }, { status: 400 });
  }
  if (!shootId.ok) {
    return NextResponse.json({ error: shootId.error }, { status: 400 });
  }
  if (!editorId.ok) {
    return NextResponse.json({ error: editorId.error }, { status: 400 });
  }
  if (!auth.canAccessClient(clientId.value)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  updates.clientId = clientId.value;
  updates.orderId = orderId.value;
  if (scriptId.value !== undefined) {
    updates.scriptId = scriptId.value;
  }
  if (creatorId.value !== undefined) {
    updates.creatorId = creatorId.value;
  }
  if (shootId.value !== undefined) {
    updates.shootId = shootId.value;
  }
  if (editorId.value !== undefined) {
    updates.editorId = editorId.value;
  }
  if (updates.deadline !== undefined) {
    updates.deadline = parseDateValue(updates.deadline) ?? null;
  }

  const refs = await assertVideoRefs({
    clientId: clientId.value,
    orderId: orderId.value,
    scriptId:
      scriptId.value !== undefined
        ? scriptId.value
        : existing.scriptId
          ? String(existing.scriptId)
          : null,
    creatorId:
      creatorId.value !== undefined
        ? creatorId.value
        : existing.creatorId
          ? String(existing.creatorId)
          : null,
    shootId:
      shootId.value !== undefined
        ? shootId.value
        : existing.shootId
          ? String(existing.shootId)
          : null,
    editorId:
      editorId.value !== undefined
        ? editorId.value
        : existing.editorId
          ? String(existing.editorId)
          : null,
  });
  if (!refs.ok) {
    return NextResponse.json({ error: refs.error }, { status: refs.status });
  }

  let video: Record<string, unknown> | null = null;
  try {
    video = (await Video.findByIdAndUpdate(
      id,
      { $set: updates },
      { returnDocument: "after", runValidators: true },
    )
      .populate(VIDEO_POPULATE)
      .lean()) as Record<string, unknown> | null;
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      const message = Object.values(error.errors)[0]?.message ?? error.message;
      return NextResponse.json({ error: message }, { status: 400 });
    }
    throw error;
  }

  if (!video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  await logActivity({
    actorId: auth.session.user.id,
    action: "video.updated",
    entityType: "Video",
    entityId: id,
    metadata: { changes: Object.keys(updates) },
  });

  const nextEditorId =
    editorId.value !== undefined
      ? editorId.value
      : existing.editorId
        ? String(existing.editorId)
        : null;
  const previousEditorId = existing.editorId ? String(existing.editorId) : null;
  if (nextEditorId && nextEditorId !== previousEditorId) {
    void queueNotification(
      notifyVideoAssignedToEditor({
        videoId: id,
        clientId: clientId.value,
        editorId: nextEditorId,
        actorId: auth.session.user.id,
      }),
    );
  }

  if (nextStatus === "Final Approved" && currentStatus !== "Final Approved") {
    void queueNotification(
      notifyFinalVideoApproved({
        videoId: id,
        clientId: clientId.value,
        editorId: nextEditorId,
        actorId: auth.session.user.id,
      }),
    );
  }

  return NextResponse.json({ video: serializeVideo(video) });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAccess("videos", "write");
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid video id" }, { status: 400 });
  }

  await connectDB();

  const existing = await Video.findById(id).lean();
  if (!existing) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }
  if (!auth.canAccessClient(String(existing.clientId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await Video.findByIdAndDelete(id);
  await logActivity({
    actorId: auth.session.user.id,
    action: "video.deleted",
    entityType: "Video",
    entityId: id,
  });

  return NextResponse.json({ ok: true });
}
