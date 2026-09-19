import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { logActivity } from "@/lib/activity";
import {
  notifyVideoAssignedToEditor,
  queueNotification,
} from "@/lib/notifications";
import { validationError } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { VIDEO_POPULATE } from "@/lib/populate";
import { requireAccess } from "@/lib/rbac";
import { serializeVideo } from "@/lib/serialize";
import {
  assertVideoRefs,
  loadVideoList,
  parseDateValue,
  parseOptionalObjectId,
} from "@/lib/videos/hub";
import { videoInputSchema } from "@/lib/validators/video";
import { Video } from "@/models/Video";

export async function GET(request: Request) {
  const auth = await requireAccess("videos", "read");
  if (!auth.ok) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");
  const orderId = searchParams.get("orderId");
  const editorId = searchParams.get("editorId");

  if (clientId && !mongoose.Types.ObjectId.isValid(clientId)) {
    return NextResponse.json({ error: "Invalid client id" }, { status: 400 });
  }
  if (orderId && !mongoose.Types.ObjectId.isValid(orderId)) {
    return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
  }
  if (editorId && !mongoose.Types.ObjectId.isValid(editorId)) {
    return NextResponse.json({ error: "Invalid editor id" }, { status: 400 });
  }

  const videos = await loadVideoList(auth, {
    clientId: clientId ?? undefined,
    orderId: orderId ?? undefined,
    editorId: editorId ?? undefined,
    q: searchParams.get("q") ?? undefined,
    status: searchParams.get("status") ?? undefined,
  });

  return NextResponse.json({ videos });
}

export async function POST(request: Request) {
  const auth = await requireAccess("videos", "write");
  if (!auth.ok) {
    return auth.response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = videoInputSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  if (!mongoose.Types.ObjectId.isValid(parsed.data.clientId)) {
    return NextResponse.json({ error: "Invalid client id" }, { status: 400 });
  }
  if (!mongoose.Types.ObjectId.isValid(parsed.data.orderId)) {
    return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
  }
  if (!auth.canAccessClient(parsed.data.clientId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const scriptId = parseOptionalObjectId(parsed.data.scriptId, "script id");
  const creatorId = parseOptionalObjectId(parsed.data.creatorId, "creator id");
  const shootId = parseOptionalObjectId(parsed.data.shootId, "shoot id");
  const editorId = parseOptionalObjectId(
    parsed.data.assignedEditorId ?? parsed.data.editorId,
    "editor id",
  );
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

  await connectDB();

  const refs = await assertVideoRefs({
    clientId: parsed.data.clientId,
    orderId: parsed.data.orderId,
    scriptId: scriptId.value,
    creatorId: creatorId.value,
    shootId: shootId.value,
    editorId: editorId.value,
  });
  if (!refs.ok) {
    return NextResponse.json({ error: refs.error }, { status: refs.status });
  }

  const created = await Video.create({
    clientId: parsed.data.clientId,
    orderId: parsed.data.orderId,
    scriptId: scriptId.value ?? null,
    creatorId: creatorId.value ?? null,
    shootId: shootId.value ?? null,
    editorId: editorId.value ?? null,
    deadline: parseDateValue(parsed.data.deadline) ?? null,
    fileLink: parsed.data.fileLink,
    thumbnailUrl: parsed.data.thumbnailUrl,
    finalDeliveryLink: parsed.data.finalDeliveryLink,
    revisionCount: parsed.data.revisionCount,
    status: parsed.data.status,
    feedbackLog: [],
  });

  await logActivity({
    actorId: auth.session.user.id,
    action: "video.created",
    entityType: "Video",
    entityId: created._id,
    metadata: {
      clientId: parsed.data.clientId,
      orderId: parsed.data.orderId,
    },
  });

  if (editorId.value) {
    void queueNotification(
      notifyVideoAssignedToEditor({
        videoId: String(created._id),
        clientId: parsed.data.clientId,
        editorId: editorId.value,
        actorId: auth.session.user.id,
      }),
    );
  }

  const populated = await Video.findById(created._id)
    .populate(VIDEO_POPULATE)
    .lean();

  return NextResponse.json(
    { video: serializeVideo(populated as Record<string, unknown> | null) },
    { status: 201 },
  );
}
