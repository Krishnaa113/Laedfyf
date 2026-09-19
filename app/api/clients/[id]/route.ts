import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { validationError } from "@/lib/api-auth";
import { loadClientHub } from "@/lib/clients/hub";
import { CLIENT_POPULATE } from "@/lib/populate";
import { requireAccess } from "@/lib/rbac";
import { serializeClient } from "@/lib/serialize";
import { clientPatchSchema } from "@/lib/validators/client";
import { canManageClientInvites } from "@/lib/roles";
import {
  decryptPortalPassword,
  portalPasswordFields,
} from "@/lib/clients/portal-password";
import { upsertPortalUser } from "@/lib/clients/invite";
import { Client } from "@/models/Client";
import { Employee } from "@/models/Employee";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAccess("clients", "read");
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

  const hub = await loadClientHub(auth, id);
  if (!hub) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  return NextResponse.json(hub);
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAccess("clients", "write");
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

  const parsed = clientPatchSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const updates: Record<string, unknown> = {};
  let nextPassword: string | null = null;
  for (const [key, value] of Object.entries(parsed.data)) {
    if (key === "password") {
      if (typeof value === "string" && value.length >= 8) {
        nextPassword = value;
      }
      continue;
    }
    if (value !== undefined) {
      updates[key] = value;
    }
  }

  if (
    typeof updates.assignedEmployeeId === "string" &&
    !mongoose.Types.ObjectId.isValid(updates.assignedEmployeeId)
  ) {
    return NextResponse.json(
      { error: "assignedEmployeeId must be a valid id" },
      { status: 400 },
    );
  }

  await connectDB();

  if (typeof updates.assignedEmployeeId === "string") {
    const employee = await Employee.findById(updates.assignedEmployeeId).lean();
    if (!employee) {
      return NextResponse.json(
        { error: "Assigned employee not found" },
        { status: 400 },
      );
    }
  }

  if (nextPassword) {
    if (!canManageClientInvites(auth.session.user.role)) {
      return NextResponse.json(
        { error: "Only the owner or admin can change a client portal password" },
        { status: 403 },
      );
    }
    Object.assign(updates, await portalPasswordFields(nextPassword));
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const existing = await Client.findById(id).select("+passwordCipher").lean();
  if (!existing) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  let client: Record<string, unknown> | null = null;
  try {
    client = (await Client.findByIdAndUpdate(
      id,
      {
        $set: updates,
        $unset: { company: 1, company_name: 1 },
      },
      { returnDocument: "after", runValidators: true },
    )
      .populate(CLIENT_POPULATE)
      .lean()) as Record<string, unknown> | null;
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      const message = Object.values(error.errors)[0]?.message ?? error.message;
      return NextResponse.json({ error: message }, { status: 400 });
    }
    throw error;
  }

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const action =
    updates.status && updates.status !== existing.status
      ? "client.status_changed"
      : "client.updated";

  await logActivity({
    actorId: auth.session.user.id,
    action,
    entityType: "Client",
    entityId: id,
    metadata: {
      changes: [
        ...Object.keys(updates).filter(
          (key) => key !== "passwordHash" && key !== "passwordCipher",
        ),
        ...(nextPassword ? ["password"] : []),
      ],
      fromStatus: existing.status,
      toStatus: client.status,
    },
  });

  if (nextPassword) {
    await upsertPortalUser({
      clientId: id,
      email: String(client.email ?? existing.email),
      name: String(client.name || client.companyName || "Client"),
      passwordHash: String(updates.passwordHash),
    });
  }

  const canReveal = canManageClientInvites(auth.session.user.role);
  const portalPassword = canReveal
    ? nextPassword ||
      decryptPortalPassword(
        typeof (client as { passwordCipher?: string }).passwordCipher ===
          "string"
          ? (client as { passwordCipher?: string }).passwordCipher
          : typeof existing.passwordCipher === "string"
            ? existing.passwordCipher
            : null,
      )
    : undefined;

  return NextResponse.json({
    client: serializeClient(
      client,
      canReveal ? { portalPassword: portalPassword ?? null } : undefined,
    ),
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAccess("clients", "write");
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

  const client = await Client.findByIdAndDelete(id).lean();
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  await logActivity({
    actorId: auth.session.user.id,
    action: "client.deleted",
    entityType: "Client",
    entityId: id,
    metadata: { companyName: client.companyName, name: client.name },
  });

  return NextResponse.json({ ok: true });
}
