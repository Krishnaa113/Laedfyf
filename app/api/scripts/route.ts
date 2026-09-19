import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { logActivity } from "@/lib/activity";
import {
  notifyScriptAssigned,
  queueNotification,
} from "@/lib/notifications";
import { validationError } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { SCRIPT_POPULATE } from "@/lib/populate";
import { requireAccess } from "@/lib/rbac";
import { serializeScript } from "@/lib/serialize";
import {
  assertScriptRefs,
  loadScriptList,
  parseOptionalObjectId,
} from "@/lib/scripts/hub";
import { scriptInputSchema } from "@/lib/validators/script";
import { Script } from "@/models/Script";

export async function GET(request: Request) {
  const auth = await requireAccess("scripts", "read");
  if (!auth.ok) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");
  const orderId = searchParams.get("orderId");

  if (clientId && !mongoose.Types.ObjectId.isValid(clientId)) {
    return NextResponse.json({ error: "Invalid client id" }, { status: 400 });
  }
  if (orderId && !mongoose.Types.ObjectId.isValid(orderId)) {
    return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
  }

  const scripts = await loadScriptList(auth, {
    clientId: clientId ?? undefined,
    orderId: orderId ?? undefined,
    q: searchParams.get("q") ?? undefined,
    status: searchParams.get("status") ?? undefined,
  });

  return NextResponse.json({ scripts });
}

export async function POST(request: Request) {
  const auth = await requireAccess("scripts", "write");
  if (!auth.ok) {
    return auth.response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = scriptInputSchema.safeParse(body);
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
  const writerId = parseOptionalObjectId(parsed.data.writerId, "writer id");
  const creatorId = parseOptionalObjectId(parsed.data.creatorId, "creator id");
  if (!orderId.ok) {
    return NextResponse.json({ error: orderId.error }, { status: 400 });
  }
  if (!writerId.ok) {
    return NextResponse.json({ error: writerId.error }, { status: 400 });
  }
  if (!creatorId.ok) {
    return NextResponse.json({ error: creatorId.error }, { status: 400 });
  }

  await connectDB();

  const refs = await assertScriptRefs({
    clientId: parsed.data.clientId,
    orderId: orderId.value,
    writerId: writerId.value,
    creatorId: creatorId.value,
  });
  if (!refs.ok) {
    return NextResponse.json({ error: refs.error }, { status: refs.status });
  }

  const created = await Script.create({
    clientId: parsed.data.clientId,
    orderId: orderId.value ?? null,
    videoNumber: parsed.data.videoNumber,
    writerId: writerId.value ?? null,
    creatorId: creatorId.value ?? null,
    language: parsed.data.language,
    scriptText: parsed.data.scriptText,
    referenceLinks: parsed.data.referenceLinks,
    deadline: parsed.data.deadline ?? null,
    revisionCount: 0,
    comments: [],
    status: parsed.data.status,
  });

  await logActivity({
    actorId: auth.session.user.id,
    action: "script.created",
    entityType: "Script",
    entityId: created._id,
    metadata: {
      clientId: parsed.data.clientId,
      orderId: orderId.value ?? null,
      videoNumber: parsed.data.videoNumber,
    },
  });

  if (writerId.value) {
    void queueNotification(
      notifyScriptAssigned({
        scriptId: String(created._id),
        clientId: parsed.data.clientId,
        writerId: writerId.value,
        videoNumber: parsed.data.videoNumber,
        actorId: auth.session.user.id,
      }),
    );
  }

  const populated = await Script.findById(created._id)
    .populate(SCRIPT_POPULATE)
    .lean();

  return NextResponse.json(
    { script: serializeScript(populated as Record<string, unknown> | null) },
    { status: 201 },
  );
}
