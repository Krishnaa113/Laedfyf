import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { validationError } from "@/lib/api-auth";
import { requireAccess } from "@/lib/rbac";
import { serializeAsset } from "@/lib/serialize";
import { clientAssetInputSchema } from "@/lib/validators/client";
import { Asset } from "@/models/Asset";
import { Client } from "@/models/Client";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAccess("assets", "read");
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid client id" }, { status: 400 });
  }

  if (!auth.canAccessClient(id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  const assets = await Asset.find(
    auth.byClient({ clientId: new mongoose.Types.ObjectId(id) }),
  )
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({
    assets: assets.map((asset) => serializeAsset(asset)),
  });
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAccess("assets", "write");
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid client id" }, { status: 400 });
  }

  if (!auth.canAccessClient(id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = clientAssetInputSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  await connectDB();

  const client = await Client.findById(id).lean();
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const asset = await Asset.create({
    clientId: id,
    uploadedById: auth.session.user.id,
    name: parsed.data.name?.trim() || parsed.data.kind || "Asset",
    kind: parsed.data.kind,
    url: parsed.data.url,
  });

  await logActivity({
    actorId: auth.session.user.id,
    action: "client.asset_added",
    entityType: "Client",
    entityId: id,
    metadata: { assetId: String(asset._id), name: asset.name, kind: asset.kind },
  });

  return NextResponse.json(
    { asset: serializeAsset(asset.toObject()) },
    { status: 201 },
  );
}
