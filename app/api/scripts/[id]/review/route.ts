import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { logActivity } from "@/lib/activity";
import {
  notifyScriptApproved,
  notifyScriptRevision,
  queueNotification,
} from "@/lib/notifications";
import { validationError } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { SCRIPT_POPULATE } from "@/lib/populate";
import { canAccess, requireAccess } from "@/lib/rbac";
import { serializeOptions, serializeScript } from "@/lib/serialize";
import { commentAuthor, extractClientId } from "@/lib/scripts/hub";
import { normalizeScriptStatus } from "@/lib/status";
import { scriptReviewSchema } from "@/lib/validators/script";
import { Script } from "@/models/Script";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAccess("scripts", "read");
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

  const parsed = scriptReviewSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const isClient = auth.session.user.role === "client";
  const canWrite = canAccess(auth.session.user, "scripts", "write");

  if (!isClient && !canWrite) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (
    (parsed.data.action === "approve" || parsed.data.action === "revision") &&
    !isClient
  ) {
    return NextResponse.json(
      { error: "Only the assigned client can approve or request a revision" },
      { status: 403 },
    );
  }

  await connectDB();

  const existing = await Script.findById(id).lean();
  if (!existing) {
    return NextResponse.json({ error: "Script not found" }, { status: 404 });
  }

  if (!auth.canAccessClient(extractClientId(existing as Record<string, unknown>))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const currentStatus = normalizeScriptStatus(existing.status);
  if (
    (parsed.data.action === "approve" || parsed.data.action === "revision") &&
    currentStatus !== "Sent to Client"
  ) {
    return NextResponse.json(
      { error: "Script is not awaiting client review" },
      { status: 400 },
    );
  }

  const commentBody = parsed.data.body.trim();
  if (parsed.data.action === "comment" && !commentBody) {
    return NextResponse.json({ error: "Comment cannot be empty" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  const push: Record<string, unknown> = {};
  const inc: Record<string, number> = {};

  if (parsed.data.action === "approve") {
    updates.status = "Approved";
  }
  if (parsed.data.action === "revision") {
    updates.status = "Revision Required";
    inc.revisionCount = 1;
  }

  if (commentBody) {
    push.comments = {
      ...commentAuthor(auth),
      body: commentBody,
      createdAt: new Date(),
    };
  }

  const updateDoc: Record<string, unknown> = {};
  if (Object.keys(updates).length > 0) {
    updateDoc.$set = updates;
  }
  if (Object.keys(push).length > 0) {
    updateDoc.$push = push;
  }
  if (Object.keys(inc).length > 0) {
    updateDoc.$inc = inc;
  }

  if (Object.keys(updateDoc).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  let script: Record<string, unknown> | null = null;
  try {
    script = (await Script.findByIdAndUpdate(id, updateDoc, {
      returnDocument: "after",
      runValidators: true,
    })
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
      parsed.data.action === "approve"
        ? "script.approved"
        : parsed.data.action === "revision"
          ? "script.revision_requested"
          : "script.commented",
    entityType: "Script",
    entityId: id,
    metadata: {
      fromStatus: currentStatus,
      toStatus: script.status,
    },
  });

  const writerId = existing.writerId ? String(existing.writerId) : null;
  const clientId = extractClientId(existing as Record<string, unknown>);
  if (parsed.data.action === "approve") {
    void queueNotification(
      notifyScriptApproved({
        scriptId: id,
        clientId,
        writerId,
        videoNumber: Number(existing.videoNumber ?? 0) || null,
        actorId: auth.session.user.id,
      }),
    );
  }
  if (parsed.data.action === "revision") {
    void queueNotification(
      notifyScriptRevision({
        scriptId: id,
        clientId,
        writerId,
        videoNumber: Number(existing.videoNumber ?? 0) || null,
        actorId: auth.session.user.id,
      }),
    );
  }

  return NextResponse.json({
    script: serializeScript(script, serializeOptions(auth.session.user)),
  });
}
