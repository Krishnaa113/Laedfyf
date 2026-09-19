import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getSession } from "@/lib/session";
import {
  type AccessAction,
  type AccessModule,
  type EmployeeSubRole,
  type Permission,
  type UserRole,
  isSystemConfigModule,
  permissionKey,
} from "@/lib/roles";
import { Client } from "@/models/Client";
import { Employee } from "@/models/Employee";

export type AuthSessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role: UserRole;
  employeeSubRole: EmployeeSubRole | null;
  clientId: string | null;
  employeeId: string | null;
  permissions: Permission[];
  allowedClientIds: string[] | null;
};

export type RoleSpec = UserRole | EmployeeSubRole;

type ModulePolicy = {
  admin: AccessAction | "all" | false;
  employee: EmployeeSubRole[] | "all" | false;
  client: AccessAction | "all" | false;
};

const MODULE_POLICY: Record<AccessModule, ModulePolicy> = {
  clients: {
    admin: "all",
    employee: ["sales", "script_writer", "shoot_manager", "editor"],
    client: "read",
  },
  orders: {
    admin: "all",
    employee: ["sales", "script_writer", "shoot_manager", "editor"],
    client: "read",
  },
  scripts: {
    admin: "all",
    employee: ["sales", "script_writer", "shoot_manager", "editor"],
    client: "read",
  },
  creators: {
    admin: "all",
    employee: ["shoot_manager"],
    client: false,
  },
  "creator-availability": {
    admin: "all",
    employee: ["shoot_manager"],
    client: false,
  },
  shoots: {
    admin: "all",
    employee: ["shoot_manager", "editor"],
    client: "read",
  },
  videos: {
    admin: "all",
    employee: ["script_writer", "shoot_manager", "editor"],
    client: "read",
  },
  "video-feedback": {
    admin: "all",
    employee: ["editor"],
    client: "all",
  },
  tasks: {
    admin: "all",
    employee: "all",
    client: false,
  },
  payments: {
    admin: "all",
    employee: ["sales"],
    client: "read",
  },
  expenses: {
    admin: "all",
    employee: false,
    client: false,
  },
  payouts: {
    admin: "all",
    employee: false,
    client: false,
  },
  analytics: {
    admin: "read",
    employee: false,
    client: false,
  },
  notifications: {
    admin: "all",
    employee: "all",
    client: "read",
  },
  tickets: {
    admin: "all",
    employee: ["sales"],
    client: "all",
  },
  employees: {
    admin: "read",
    employee: false,
    client: false,
  },
  users: {
    admin: false,
    employee: false,
    client: false,
  },
  "activity-logs": {
    admin: "all",
    employee: false,
    client: false,
  },
  assets: {
    admin: "all",
    employee: ["sales"],
    client: "read",
  },
};

const EMPLOYEE_WRITE_MODULES = new Set<AccessModule>([
  "clients",
  "orders",
  "scripts",
  "creators",
  "creator-availability",
  "shoots",
  "videos",
  "video-feedback",
  "tasks",
  "payments",
  "tickets",
  "assets",
]);

const EMPLOYEE_WRITE_SUB_ROLES: Partial<Record<AccessModule, EmployeeSubRole[]>> =
  {
    clients: ["sales"],
    orders: ["sales"],
    scripts: ["script_writer"],
    creators: ["shoot_manager"],
    "creator-availability": ["shoot_manager"],
    shoots: ["shoot_manager"],
    videos: ["editor"],
    "video-feedback": ["editor"],
    tasks: ["sales", "script_writer", "shoot_manager", "editor"],
    payments: ["sales"],
    tickets: ["sales"],
    assets: ["sales"],
  };

function actionAllowed(
  allowed: AccessAction | "all" | false,
  action: AccessAction,
): boolean {
  if (allowed === false) {
    return false;
  }
  if (allowed === "all") {
    return true;
  }
  return allowed === action;
}

export function canAccess(
  user: Pick<
    AuthSessionUser,
    "role" | "employeeSubRole" | "clientId" | "permissions"
  >,
  module: AccessModule,
  action: AccessAction,
): boolean {
  if (user.role === "owner") {
    return true;
  }

  const policy = MODULE_POLICY[module];

  if (user.role === "admin") {
    if (isSystemConfigModule(module)) {
      return false;
    }
    const key = permissionKey(module, action);
    if (key && user.permissions?.length) {
      return user.permissions.includes(key);
    }
    return actionAllowed(policy.admin, action);
  }

  if (user.role === "employee") {
    if (!user.employeeSubRole) {
      return policy.employee === "all" && action === "read";
    }

    if (action === "write") {
      if (!EMPLOYEE_WRITE_MODULES.has(module)) {
        return false;
      }
      const writers = EMPLOYEE_WRITE_SUB_ROLES[module] ?? [];
      return writers.includes(user.employeeSubRole);
    }

    if (policy.employee === "all") {
      return true;
    }
    if (policy.employee === false) {
      return false;
    }
    return policy.employee.includes(user.employeeSubRole);
  }

  if (user.role === "client") {
    if (!user.clientId) {
      return false;
    }
    return actionAllowed(policy.client, action);
  }

  return false;
}

export function clientObjectId(clientId: string) {
  return new mongoose.Types.ObjectId(clientId);
}

export function scopedQuery(
  user: AuthSessionUser,
  filter: Record<string, unknown> = {},
) {
  if (user.role === "client") {
    return {
      ...filter,
      clientId: clientObjectId(user.clientId!),
    };
  }

  if (user.role === "employee" && user.allowedClientIds) {
    return {
      ...filter,
      clientId: { $in: user.allowedClientIds.map(clientObjectId) },
    };
  }

  return filter;
}

export type AuthOk = {
  ok: true;
  session: { user: AuthSessionUser };
  byClient: (filter?: Record<string, unknown>) => Record<string, unknown>;
  canAccessClient: (clientId: string) => boolean;
};

export type AuthDenied = {
  ok: false;
  response: NextResponse;
};

export type AuthResult = AuthOk | AuthDenied;

function denied(status: number, error: string): AuthDenied {
  return {
    ok: false,
    response: NextResponse.json({ error }, { status }),
  };
}

function canAccessAssignedClient(user: AuthSessionUser, clientId: string) {
  if (user.role === "client") {
    return user.clientId === clientId;
  }
  if (user.role === "employee" && user.allowedClientIds) {
    return user.allowedClientIds.includes(clientId);
  }
  return true;
}

async function resolveEmployeeScope(user: AuthSessionUser) {
  if (user.role !== "employee") {
    return user;
  }

  await connectDB();
  const employee = user.employeeId
    ? await Employee.findById(user.employeeId).select("_id userId").lean()
    : await Employee.findOne({ userId: user.id }).select("_id userId").lean();

  if (!employee) {
    return {
      ...user,
      employeeId: null,
      allowedClientIds: [],
    };
  }

  const clients = await Client.find({ assignedEmployeeId: employee._id })
    .select("_id")
    .lean();

  return {
    ...user,
    employeeId: String(employee._id),
    allowedClientIds: clients.map((client) => String(client._id)),
  };
}

function withAuthHelpers(user: AuthSessionUser): AuthOk {
  return {
    ok: true,
    session: { user },
    byClient(filter = {}) {
      return scopedQuery(user, filter);
    },
    canAccessClient(clientId: string) {
      return canAccessAssignedClient(user, clientId);
    },
  };
}

async function fromSession(session: {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    role: UserRole;
    employeeSubRole?: EmployeeSubRole | null;
    clientId?: string | null;
    employeeId?: string | null;
    permissions?: Permission[];
  };
}): Promise<AuthOk> {
  const user = await resolveEmployeeScope({
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role,
    employeeSubRole: session.user.employeeSubRole ?? null,
    clientId: session.user.clientId ?? null,
    employeeId: session.user.employeeId ?? null,
    permissions: session.user.permissions ?? [],
    allowedClientIds: null,
  });

  return withAuthHelpers(user);
}

export async function requireRole(
  allowed: RoleSpec | RoleSpec[],
): Promise<AuthResult> {
  const session = await getSession();
  if (!session?.user) {
    return denied(401, "Unauthorized");
  }

  const auth = await fromSession(session);
  const user = auth.session.user;
  const allowedList = Array.isArray(allowed) ? allowed : [allowed];

  if (user.role === "owner") {
    return auth;
  }

  const permitted = allowedList.some((spec) => {
    if (spec === "admin" || spec === "employee" || spec === "client") {
      return user.role === spec;
    }
    return user.role === "employee" && user.employeeSubRole === spec;
  });

  if (!permitted) {
    return denied(403, "Forbidden");
  }

  if (user.role === "client" && !user.clientId) {
    return denied(403, "Client session is missing clientId");
  }

  return auth;
}

export async function requireAccess(
  module: AccessModule,
  action: AccessAction = "read",
): Promise<AuthResult> {
  const session = await getSession();
  if (!session?.user) {
    return denied(401, "Unauthorized");
  }

  const auth = await fromSession(session);
  if (!canAccess(auth.session.user, module, action)) {
    return denied(403, "Forbidden");
  }

  if (auth.session.user.role === "client" && !auth.session.user.clientId) {
    return denied(403, "Client session is missing clientId");
  }

  return auth;
}
