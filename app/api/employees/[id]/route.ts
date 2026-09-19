import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { logActivity } from "@/lib/activity";
import { validationError } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { loadEmployeeHub } from "@/lib/employees/hub";
import { canAccess, requireAccess } from "@/lib/rbac";
import { defaultPermissionsForRole } from "@/lib/roles";
import { serializeEmployee } from "@/lib/serialize";
import { employeePatchSchema } from "@/lib/validators/employee";
import { Employee } from "@/models/Employee";
import { User } from "@/models/User";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAccess("employees", "read");
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid employee id" }, { status: 400 });
  }

  const employee = await loadEmployeeHub(id, {
    includeCompensation: canAccess(auth.session.user, "employees", "read"),
  });
  if (!employee) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  return NextResponse.json({ employee });
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAccess("employees", "write");
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid employee id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = employeePatchSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  await connectDB();
  const existing = await Employee.findById(id).lean();
  if (!existing) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  const employeeUpdates: Record<string, unknown> = {};
  const userUpdates: Record<string, unknown> = {};

  if (parsed.data.jobTitle !== undefined) {
    employeeUpdates.jobTitle = parsed.data.jobTitle;
  }
  if (parsed.data.department !== undefined) {
    employeeUpdates.department = parsed.data.department;
  }
  if (parsed.data.salary !== undefined) {
    employeeUpdates.salary = parsed.data.salary;
  }
  if (parsed.data.joiningDate !== undefined) {
    employeeUpdates.joiningDate = parsed.data.joiningDate
      ? new Date(parsed.data.joiningDate)
      : null;
  }
  if (parsed.data.phone !== undefined) {
    employeeUpdates.phone = parsed.data.phone;
  }
  if (parsed.data.isActive !== undefined) {
    employeeUpdates.isActive = parsed.data.isActive;
    userUpdates.isActive = parsed.data.isActive;
  }
  if (parsed.data.name !== undefined) {
    userUpdates.name = parsed.data.name;
  }
  if (parsed.data.email !== undefined) {
    userUpdates.email = parsed.data.email.trim().toLowerCase();
  }
  if (parsed.data.employeeSubRole !== undefined) {
    userUpdates.employeeSubRole = parsed.data.employeeSubRole;
    userUpdates.permissions = defaultPermissionsForRole(
      "employee",
      parsed.data.employeeSubRole,
    );
  }
  if (parsed.data.password) {
    if (auth.session.user.role !== "owner") {
      return NextResponse.json(
        { error: "Only the owner can change an employee password" },
        { status: 403 },
      );
    }
    userUpdates.passwordHash = await bcrypt.hash(parsed.data.password, 12);
  }

  if (typeof userUpdates.email === "string") {
    const clash = await User.findOne({
      email: userUpdates.email,
      _id: { $ne: existing.userId },
    })
      .select("_id")
      .lean();
    if (clash) {
      return NextResponse.json({ error: "A user with that email already exists" }, { status: 409 });
    }
  }

  if (Object.keys(employeeUpdates).length > 0) {
    await Employee.findByIdAndUpdate(id, { $set: employeeUpdates }, { runValidators: true });
  }
  if (Object.keys(userUpdates).length > 0 && existing.userId) {
    await User.findByIdAndUpdate(existing.userId, { $set: userUpdates }, { runValidators: true });
  }

  await logActivity({
    actorId: auth.session.user.id,
    action: "employee.updated",
    entityType: "Employee",
    entityId: id,
    metadata: { changes: Object.keys({ ...employeeUpdates, ...userUpdates }) },
  });

  const populated = await Employee.findById(id)
    .populate({ path: "userId", select: "name email role employeeSubRole isActive" })
    .lean();

  return NextResponse.json({
    employee: serializeEmployee(populated as Record<string, unknown> | null, {
      includeCompensation: true,
    }),
  });
}
