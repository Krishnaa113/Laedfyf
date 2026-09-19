import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { logActivity } from "@/lib/activity";
import {
  notifyClientFeedbackPosted,
  notifyFinalVideoApproved,
  queueNotification,
} from "@/lib/notifications";
import { validationError } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { VIDEO_POPULATE } from "@/lib/populate";
import { canAccess, requireAccess } from "@/lib/rbac";
import { serializeOptions, serializeVideo } from "@/lib/serialize";
import { commentAuthor } from "@/lib/scripts/hub";
import { normalizeVideoStatus } from "@/lib/status";
import { DeliveryError, deliverVideoInTransaction } from "@/lib/videos/delivery";
import { extractClientId } from "@/lib/videos/hub";
import { videoReviewSchema } from "@/lib/validators/video";
import { Video } from "@/models/Video";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAccess("videos", "read");
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

  const parsed = videoReviewSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const isClient = auth.session.user.role === "client";
  const canWrite = canAccess(auth.session.user, "videos", "write");

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

  const existing = await Video.findById(id).lean();
  if (!existing) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  if (!auth.canAccessClient(extractClientId(existing as Record<string, unknown>))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const currentStatus = normalizeVideoStatus(existing.status);
  if (
    (parsed.data.action === "approve" || parsed.data.action === "revision") &&
    currentStatus !== "Client Review"
  ) {
    return NextResponse.json(
      { error: "Video is not awaiting client review" },
      { status: 400 },
    );
  }

  const commentBody = parsed.data.body.trim();
  if (parsed.data.action === "comment" && !commentBody) {
    return NextResponse.json({ error: "Comment cannot be empty" }, { status: 400 });
  }

  const author = commentAuthor(auth);
  const reviewedAt = new Date();
  const feedback = commentBody
    ? {
        ...author,
        body: commentBody,
        timecode: parsed.data.timecode,
        createdAt: reviewedAt,
        decision:
          parsed.data.action === "approve"
            ? ("Approve" as const)
            : parsed.data.action === "revision"
              ? ("Request Revision" as const)
              : ("Comment" as const),
      }
    : null;

  const options = serializeOptions(auth.session.user);

  if (parsed.data.action === "approve") {
    try {
      const delivered = await deliverVideoInTransaction({
        videoId: id,
        finalDeliveryLink:
          parsed.data.finalDeliveryLink ||
          String(existing.finalDeliveryLink ?? existing.fileLink ?? ""),
        feedback,
        audience: options.audience,
      });
      await logActivity({
        actorId: auth.session.user.id,
        action: "video.approved",
        entityType: "Video",
        entityId: id,
        metadata: { status: "Delivered" },
      });
      void queueNotification(
        notifyFinalVideoApproved({
          videoId: id,
          clientId: extractClientId(existing as Record<string, unknown>),
          editorId: existing.editorId ? String(existing.editorId) : null,
          actorId: auth.session.user.id,
        }),
      );
      return NextResponse.json({ video: delivered.video });
    } catch (error) {
      if (error instanceof DeliveryError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }
      throw error;
    }
  }

  const updates: Record<string, unknown> = {};
  const push: Record<string, unknown> = {};
  const inc: Record<string, number> = {};

  if (parsed.data.action === "revision") {
    updates.status = "Revision";
    updates.revisionPriority = true;
    updates.revisionRequestedAt = reviewedAt;
    if (existing.editorId) {
      updates.editorId = existing.editorId;
    }
    inc.revisionCount = 1;
  }
  if (feedback) {
    push.feedbackLog = feedback;
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

  let video: Record<string, unknown> | null = null;
  try {
    video = (await Video.findByIdAndUpdate(id, updateDoc, {
      returnDocument: "after",
      runValidators: true,
    })
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
    action:
      parsed.data.action === "revision"
        ? "video.revision_requested"
        : "video.commented",
    entityType: "Video",
    entityId: id,
  });

  if (feedback) {
    void queueNotification(
      notifyClientFeedbackPosted({
        videoId: id,
        clientId: extractClientId(existing as Record<string, unknown>),
        editorId: existing.editorId ? String(existing.editorId) : null,
        actorId: auth.session.user.id,
      }),
    );
  }

  return NextResponse.json({ video: serializeVideo(video, options) });
}
