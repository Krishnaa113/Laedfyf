import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import {
  notifyClientOnboarded,
  queueNotification,
} from "@/lib/notifications";
import { validationError } from "@/lib/api-auth";
import { loadClientList } from "@/lib/clients/hub";
import { requireAccess } from "@/lib/rbac";
import { serializeAsset, serializeClient } from "@/lib/serialize";
import { clientWriteSchema } from "@/lib/validators/client";
import { canManageClientInvites } from "@/lib/roles";
import { portalPasswordFields } from "@/lib/clients/portal-password";
import { upsertPortalUser } from "@/lib/clients/invite";
import { Asset } from "@/models/Asset";
import { Client } from "@/models/Client";
import { Employee } from "@/models/Employee";

async function createClientAssets(
  clientId: mongoose.Types.ObjectId,
  uploadedById: string,
  assets: { name?: string; url: string; kind?: string }[],
) {
  if (assets.length === 0) {
    return [];
  }

  const created = await Asset.insertMany(
    assets.map((asset) => ({
      clientId,
      uploadedById: mongoose.Types.ObjectId.isValid(uploadedById)
        ? uploadedById
        : null,
      name: asset.name?.trim() || asset.kind || "Asset",
      kind: asset.kind ?? "Other",
      url: asset.url,
    })),
  );

  return created.map((asset) => serializeAsset(asset.toObject()));
}

export async function GET(request: Request) {
  const auth = await requireAccess("clients", "read");
  if (!auth.ok) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const clients = await loadClientList(auth, {
    q: searchParams.get("q") ?? undefined,
    status: searchParams.get("status") ?? undefined,
  });

  return NextResponse.json({ clients });
}

export async function POST(request: Request) {
  const auth = await requireAccess("clients", "write");
  if (!auth.ok) {
    return auth.response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = clientWriteSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const { assignedEmployeeId, assets = [], password, ...rest } = parsed.data;
  if (
    assignedEmployeeId &&
    !mongoose.Types.ObjectId.isValid(assignedEmployeeId)
  ) {
    return NextResponse.json(
      { error: "assignedEmployeeId must be a valid id" },
      { status: 400 },
    );
  }

  await connectDB();

  if (assignedEmployeeId) {
    const employee = await Employee.findById(assignedEmployeeId).lean();
    if (!employee) {
      return NextResponse.json(
        { error: "Assigned employee not found" },
        { status: 400 },
      );
    }
  }

  const passwordFields = await portalPasswordFields(password);
  const client = await Client.create({
    name: rest.name,
    companyName: rest.companyName,
    email: rest.email,
    phone: rest.phone,
    whatsapp: rest.whatsapp,
    brandName: rest.brandName,
    industry: rest.industry,
    gstTaxId: rest.gstTaxId,
    source: rest.source,
    status: rest.status,
    notes: rest.notes,
    passwordHash: passwordFields.passwordHash,
    passwordCipher: passwordFields.passwordCipher,
    passwordSet: true,
    assignedEmployeeId: assignedEmployeeId
      ? new mongoose.Types.ObjectId(assignedEmployeeId)
      : undefined,
  });

  await upsertPortalUser({
    clientId: String(client._id),
    email: client.email,
    name: client.name || client.companyName || "Client",
    passwordHash: passwordFields.passwordHash,
  });

  const createdAssets = await createClientAssets(
    client._id,
    auth.session.user.id,
    assets,
  );

  await logActivity({
    actorId: auth.session.user.id,
    action: "client.created",
    entityType: "Client",
    entityId: client._id,
    metadata: { companyName: client.companyName, status: client.status },
  });

  void queueNotification(
    notifyClientOnboarded({
      clientId: String(client._id),
      companyName: client.companyName,
      assignedEmployeeId: assignedEmployeeId ?? null,
      actorId: auth.session.user.id,
    }),
  );

  return NextResponse.json(
    {
      client: serializeClient(
        client.toObject(),
        canManageClientInvites(auth.session.user.role)
          ? { portalPassword: password }
          : undefined,
      ),
      assets: createdAssets,
    },
    { status: 201 },
  );
}
