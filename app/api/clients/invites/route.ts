import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { logActivity } from "@/lib/activity";
import { validationError } from "@/lib/api-auth";
import { requireAccess } from "@/lib/rbac";
import {
  canManageClientInvites,
  issueClientInviteLink,
  publicAppOrigin,
} from "@/lib/clients/invite";
import { bulkInviteSchema } from "@/lib/validators/portal-auth";

export async function POST(request: Request) {
  const auth = await requireAccess("clients", "read");
  if (!auth.ok) {
    return auth.response;
  }
  if (!canManageClientInvites(auth.session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bulkInviteSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const origin = publicAppOrigin(request);
  const invites: Array<{
    clientName: string;
    phone: string;
    whatsapp: string;
    inviteLink: string;
    email: string;
  }> = [];
  const skipped: Array<{ id: string; error: string }> = [];

  for (const id of parsed.data.ids) {
    if (!mongoose.Types.ObjectId.isValid(id) || !auth.canAccessClient(id)) {
      skipped.push({ id, error: "Invalid or forbidden client" });
      continue;
    }
    const result = await issueClientInviteLink(id, origin, "invite");
    if (!result.ok) {
      skipped.push({ id, error: result.error });
      continue;
    }
    invites.push({
      clientName: result.invite.clientName,
      phone: result.invite.phone,
      whatsapp: result.invite.whatsapp,
      inviteLink: result.invite.inviteLink,
      email: result.invite.email,
    });
  }

  await logActivity({
    actorId: auth.session.user.id,
    action: "client.invite_links_bulk",
    entityType: "Client",
    entityId: auth.session.user.id,
    metadata: { issued: invites.length, skipped: skipped.length },
  });

  return NextResponse.json({ invites, skipped });
}
