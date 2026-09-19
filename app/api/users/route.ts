import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { logActivity } from "@/lib/activity";
import { validationError } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { requireAccess } from "@/lib/rbac";
import { defaultPermissionsForRole } from "@/lib/roles";
import { serializeUser } from "@/lib/serialize";
import { loadUserList } from "@/lib/users/hub";
import { userInputSchema } from "@/lib/validators/user";
import { Employee } from "@/models/Employee";
import { User } from "@/models/User";

export async function GET() {
  const auth = await requireAccess("users", "read");
  if (!auth.ok) {
    return auth.response;
  }

  const users = await loadUserList();
  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const auth = await requireAccess("users", "write");
  if (!auth.ok) {
    return auth.response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = userInputSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  if (parsed.data.role === "client") {
    return NextResponse.json(
      { error: "Create portal access from the client record instead." },
      { status: 400 },
    );
  }

  await connectDB();
  const email = parsed.data.email.trim().toLowerCase();
  const existing = await User.findOne({ email }).select("_id").lean();
  if (existing) {
    return NextResponse.json({ error: "A user with that email already exists" }, { status: 409 });
  }

  const employeeSubRole =
    parsed.data.role === "employee" ? parsed.data.employeeSubRole : null;
  const user = await User.create({
    name: parsed.data.name,
    email,
    passwordHash: await bcrypt.hash(parsed.data.password, 12),
    role: parsed.data.role,
    employeeSubRole,
    permissions:
      parsed.data.permissions.length > 0
        ? parsed.data.permissions
        : defaultPermissionsForRole(parsed.data.role, employeeSubRole),
    isActive: parsed.data.isActive,
  });

  if (parsed.data.role === "employee") {
    await Employee.create({
      userId: user._id,
      jobTitle: "",
      isActive: parsed.data.isActive,
    });
  }

  await logActivity({
    actorId: auth.session.user.id,
    action: "user.created",
    entityType: "User",
    entityId: user._id,
    metadata: { role: parsed.data.role },
  });

  return NextResponse.json({ user: serializeUser(user.toObject()) }, { status: 201 });
}
