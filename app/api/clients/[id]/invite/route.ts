import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { logActivity } from "@/lib/activity";
import { requireAccess } from "@/lib/rbac";
import {
  canManageClientInvites,
  issueClientInviteLink,
  publicAppOrigin,
  type InviteKind,
} from "@/lib/clients/invite";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAccess("clients", "read");
  if (!auth.ok) {
    return auth.response;
  }
  if (!canManageClientInvites(auth.session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid client id" }, { status: 400 });
  }
  if (!auth.canAccessClient(id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let kind: InviteKind = "invite";
  try {
    const body = (await request.json()) as { kind?: string };
    if (body.kind === "reset") {
      kind = "reset";
    }
  } catch {
    kind = "invite";
  }

  const result = await issueClientInviteLink(id, publicAppOrigin(request), kind);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  await logActivity({
    actorId: auth.session.user.id,
    action: kind === "reset" ? "client.reset_link" : "client.invite_link",
    entityType: "Client",
    entityId: id,
    metadata: { expiresAt: result.invite.expiresAt },
  });

  return NextResponse.json({ invite: result.invite });
}
