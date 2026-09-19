import { NextResponse } from "next/server";
import { validationError } from "@/lib/api-auth";
import { authenticatePortalClient } from "@/lib/clients/invite";
import { INVITE_REQUIRED_MESSAGE } from "@/lib/clients/invite-messages";
import { portalLoginCheckSchema } from "@/lib/validators/portal-auth";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = portalLoginCheckSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const result = await authenticatePortalClient(
    parsed.data.clientName || parsed.data.email,
    parsed.data.password,
  );

  if (!result.ok && result.error === "invite") {
    return NextResponse.json(
      { error: INVITE_REQUIRED_MESSAGE },
      { status: 403 },
    );
  }
  if (!result.ok) {
    return NextResponse.json({ error: "Invalid client name or password." }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
