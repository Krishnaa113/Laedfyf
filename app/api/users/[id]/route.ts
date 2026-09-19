import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { logActivity } from "@/lib/activity";
import { validationError } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { requireAccess } from "@/lib/rbac";
import { defaultPermissionsForRole } from "@/lib/roles";
import { serializeUser } from "@/lib/serialize";
import { loadUserHub } from "@/lib/users/hub";
import { userPatchSchema } from "@/lib/validators/user";
import { Employee } from "@/models/Employee";
import { User } from "@/models/User";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAccess("users", "read");
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  const user = await loadUserHub(id);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user });
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAccess("users", "write");
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = userPatchSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  if (parsed.data.role === "client") {
    return NextResponse.json(
      { error: "Client portal users are managed from the client record." },
      { status: 400 },
    );
  }

  await connectDB();
  const existing = await User.findById(id).lean();
  if (!existing) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (String(existing._id) === auth.session.user.id && parsed.data.role && parsed.data.role !== existing.role) {
    return NextResponse.json({ error: "You cannot change your own role" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) {
    updates.name = parsed.data.name;
  }
  if (parsed.data.email !== undefined) {
    updates.email = parsed.data.email.trim().toLowerCase();
  }
  if (parsed.data.role !== undefined) {
    updates.role = parsed.data.role;
    updates.employeeSubRole =
      parsed.data.role === "employee"
        ? parsed.data.employeeSubRole ?? existing.employeeSubRole ?? "sales"
        : null;
  }
  if (parsed.data.employeeSubRole !== undefined && (parsed.data.role ?? existing.role) === "employee") {
    updates.employeeSubRole = parsed.data.employeeSubRole;
  }
  if (parsed.data.permissions !== undefined) {
    updates.permissions = parsed.data.permissions;
  } else if (parsed.data.role !== undefined || parsed.data.employeeSubRole !== undefined) {
    updates.permissions = defaultPermissionsForRole(
      (parsed.data.role ?? existing.role) as "owner" | "admin" | "employee" | "client",
      (updates.employeeSubRole as "sales" | "script_writer" | "shoot_manager" | "editor" | null) ??
        null,
    );
  }
  if (parsed.data.isActive !== undefined) {
    updates.isActive = parsed.data.isActive;
  }
  if (parsed.data.password) {
    updates.passwordHash = await bcrypt.hash(parsed.data.password, 12);
  }

  if (typeof updates.email === "string") {
    const clash = await User.findOne({ email: updates.email, _id: { $ne: id } })
      .select("_id")
      .lean();
    if (clash) {
      return NextResponse.json({ error: "A user with that email already exists" }, { status: 409 });
    }
  }

  const user = await User.findByIdAndUpdate(id, { $set: updates }, {
    returnDocument: "after",
    runValidators: true,
  }).lean();

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (user.role === "employee") {
    await Employee.findOneAndUpdate(
      { userId: user._id },
      { $setOnInsert: { userId: user._id }, $set: { isActive: user.isActive } },
      { upsert: true },
    );
  }

  await logActivity({
    actorId: auth.session.user.id,
    action: "user.updated",
    entityType: "User",
    entityId: id,
    metadata: { changes: Object.keys(updates) },
  });

  return NextResponse.json({ user: serializeUser(user as Record<string, unknown>) });
}
