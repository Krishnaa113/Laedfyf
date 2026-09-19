import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { validationError } from "@/lib/api-auth";
import { loadInviteClient, setClientPasswordFromInvite } from "@/lib/clients/invite";
import { setPasswordSchema } from "@/lib/validators/portal-auth";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const client = await loadInviteClient(token);
  if (!client) {
    return NextResponse.json(
      {
        error:
          "This invite link is invalid or has expired. Contact the agency for a new link.",
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    companyName: client.companyName,
    passwordSet: Boolean(client.passwordSet),
  });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = setPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  try {
    const result = await setClientPasswordFromInvite(
      parsed.data.token,
      parsed.data.password,
    );
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    await logActivity({
      actorId: result.clientId,
      action: "client.password_set",
      entityType: "Client",
      entityId: result.clientId,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Could not save password. Contact the agency for a new link." },
      { status: 500 },
    );
  }
}
