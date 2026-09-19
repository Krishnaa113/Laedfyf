import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { validationError } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { loadCreatorList } from "@/lib/creators/hub";
import { canAccess, requireAccess } from "@/lib/rbac";
import { serializeCreator } from "@/lib/serialize";
import { creatorInputSchema } from "@/lib/validators/creator";
import { Creator } from "@/models/Creator";

export async function GET(request: Request) {
  const directory = await requireAccess("creators", "read");
  const viaScripts = directory.ok
    ? directory
    : await requireAccess("scripts", "write");
  const auth = viaScripts.ok
    ? viaScripts
    : await requireAccess("videos", "write");

  if (!auth.ok) {
    return auth.response;
  }

  const includePayout = canAccess(auth.session.user, "creators", "read");
  const { searchParams } = new URL(request.url);

  const creators = await loadCreatorList({
    q: searchParams.get("q") ?? undefined,
    availability: searchParams.get("availability") ?? undefined,
    location: searchParams.get("location") ?? undefined,
    includePayout,
  });

  return NextResponse.json({ creators });
}

export async function POST(request: Request) {
  const auth = await requireAccess("creators", "write");
  if (!auth.ok) {
    return auth.response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = creatorInputSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  await connectDB();

  const created = await Creator.create({
    name: parsed.data.name,
    photoUrl: parsed.data.photoUrl,
    gender: parsed.data.gender,
    ageGroup: parsed.data.ageGroup,
    languages: parsed.data.languages,
    location: parsed.data.location,
    niches: parsed.data.niches,
    demographics: parsed.data.demographics,
    email: parsed.data.email,
    phone: parsed.data.phone,
    rate: parsed.data.rate,
    bankAccountName: parsed.data.bankAccountName,
    bankAccountNumber: parsed.data.bankAccountNumber,
    upiId: parsed.data.upiId,
    portfolioLinks: parsed.data.portfolioLinks,
    availability: parsed.data.availability,
    isActive: parsed.data.isActive,
  });

  await logActivity({
    actorId: auth.session.user.id,
    action: "creator.created",
    entityType: "Creator",
    entityId: created._id,
    metadata: { name: parsed.data.name },
  });

  return NextResponse.json(
    {
      creator: serializeCreator(created.toObject(), { includePayout: true }),
    },
    { status: 201 },
  );
}
