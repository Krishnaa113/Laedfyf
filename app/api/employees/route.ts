import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { logActivity } from "@/lib/activity";
import { validationError } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { loadEmployeeList } from "@/lib/employees/hub";
import { canAccess, requireAccess } from "@/lib/rbac";
import { defaultPermissionsForRole } from "@/lib/roles";
import { serializeEmployee } from "@/lib/serialize";
import { employeeInputSchema } from "@/lib/validators/employee";
import { Employee } from "@/models/Employee";
import { User } from "@/models/User";

async function resolveEmployeeAuth() {
  const directory = await requireAccess("employees", "read");
  if (directory.ok) {
    return directory;
  }
  const viaClients = await requireAccess("clients", "write");
  if (viaClients.ok) {
    return viaClients;
  }
  const viaOrders = await requireAccess("orders", "write");
  if (viaOrders.ok) {
    return viaOrders;
  }
  const viaScripts = await requireAccess("scripts", "write");
  if (viaScripts.ok) {
    return viaScripts;
  }
  const viaCreators = await requireAccess("creators", "write");
  if (viaCreators.ok) {
    return viaCreators;
  }
  const viaShoots = await requireAccess("shoots", "write");
  if (viaShoots.ok) {
    return viaShoots;
  }
  return requireAccess("videos", "write");
}

export async function GET() {
  const auth = await resolveEmployeeAuth();
  if (!auth.ok) {
    return auth.response;
  }

  const includeCompensation = canAccess(auth.session.user, "employees", "read");
  const employees = await loadEmployeeList({ includeCompensation });
  return NextResponse.json({ employees });
}

export async function POST(request: Request) {
  const auth = await requireAccess("employees", "write");
  if (!auth.ok) {
    return auth.response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = employeeInputSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  await connectDB();
  const email = parsed.data.email.trim().toLowerCase();
  const existing = await User.findOne({ email }).select("_id").lean();
  if (existing) {
    return NextResponse.json({ error: "A user with that email already exists" }, { status: 409 });
  }

  const user = await User.create({
    name: parsed.data.name,
    email,
    passwordHash: await bcrypt.hash(parsed.data.password, 12),
    role: "employee",
    employeeSubRole: parsed.data.employeeSubRole,
    permissions: defaultPermissionsForRole("employee", parsed.data.employeeSubRole),
    isActive: parsed.data.isActive,
  });

  const employee = await Employee.create({
    userId: user._id,
    jobTitle: parsed.data.jobTitle,
    department: parsed.data.department,
    salary: parsed.data.salary,
    joiningDate: parsed.data.joiningDate ? new Date(parsed.data.joiningDate) : null,
    phone: parsed.data.phone,
    isActive: parsed.data.isActive,
  });

  await logActivity({
    actorId: auth.session.user.id,
    action: "employee.created",
    entityType: "Employee",
    entityId: employee._id,
    metadata: { userId: String(user._id) },
  });

  const populated = await Employee.findById(employee._id)
    .populate({ path: "userId", select: "name email role employeeSubRole isActive" })
    .lean();

  return NextResponse.json(
    {
      employee: serializeEmployee(populated as Record<string, unknown> | null, {
        includeCompensation: true,
      }),
    },
    { status: 201 },
  );
}
