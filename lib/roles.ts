export const USER_ROLES = ["owner", "admin", "employee", "client"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const INTERNAL_ROLES: UserRole[] = ["owner", "admin", "employee"];

export const EMPLOYEE_SUB_ROLES = [
  "sales",
  "script_writer",
  "shoot_manager",
  "editor",
] as const;

export type EmployeeSubRole = (typeof EMPLOYEE_SUB_ROLES)[number];

export const EMPLOYEE_SUB_ROLE_LABELS: Record<EmployeeSubRole, string> = {
  sales: "Sales",
  script_writer: "Script Writer",
  shoot_manager: "Shoot Manager",
  editor: "Editor",
};

export const ACCESS_MODULES = [
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
  "expenses",
  "payouts",
  "analytics",
  "notifications",
  "tickets",
  "employees",
  "users",
  "activity-logs",
  "assets",
] as const;

export type AccessModule = (typeof ACCESS_MODULES)[number];

export type AccessAction = "read" | "write";

export const PERMISSIONS = [
  "clients.read",
  "clients.write",
  "orders.read",
  "orders.write",
  "scripts.read",
  "scripts.write",
  "creators.read",
  "creators.write",
  "shoots.read",
  "shoots.write",
  "videos.read",
  "videos.write",
  "tasks.read",
  "tasks.write",
  "payments.read",
  "payments.write",
  "expenses.read",
  "expenses.write",
  "payouts.read",
  "payouts.write",
  "tickets.read",
  "tickets.write",
  "employees.read",
  "employees.write",
  "reports.read",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export function isInternalRole(role: UserRole | undefined): boolean {
  return role === "owner" || role === "admin" || role === "employee";
}

export function isClientRole(role: UserRole | undefined): boolean {
  return role === "client";
}

export function canManageClientInvites(role?: UserRole | string | null) {
  return role === "owner" || role === "admin";
}

export function isSystemConfigModule(module: AccessModule): boolean {
  return module === "users";
}

export function permissionKey(
  module: AccessModule,
  action: AccessAction,
): Permission | null {
  if (module === "analytics") {
    return action === "read" ? "reports.read" : null;
  }
  if (module === "creator-availability") {
    return action === "write" ? "creators.write" : "creators.read";
  }
  if (module === "video-feedback") {
    return action === "write" ? "videos.write" : "videos.read";
  }
  if (module === "assets") {
    return action === "write" ? "clients.write" : "clients.read";
  }

  const key = `${module}.${action}`;
  return (PERMISSIONS as readonly string[]).includes(key)
    ? (key as Permission)
    : null;
}

export function defaultPermissionsForRole(
  role: UserRole,
  subRole?: EmployeeSubRole | null,
): Permission[] {
  if (role === "owner") {
    return [...PERMISSIONS];
  }

  if (role === "admin") {
    return PERMISSIONS.filter((permission) => permission !== "employees.write");
  }

  if (role === "employee") {
    switch (subRole) {
      case "sales":
        return [
          "clients.read",
          "clients.write",
          "orders.read",
          "orders.write",
          "payments.read",
          "payments.write",
          "tickets.read",
          "tickets.write",
        ];
      case "script_writer":
        return [
          "clients.read",
          "orders.read",
          "scripts.read",
          "scripts.write",
          "videos.read",
        ];
      case "shoot_manager":
        return [
          "clients.read",
          "orders.read",
          "scripts.read",
          "creators.read",
          "creators.write",
          "shoots.read",
          "shoots.write",
        ];
      case "editor":
        return [
          "clients.read",
          "orders.read",
          "scripts.read",
          "shoots.read",
          "videos.read",
          "videos.write",
        ];
      default:
        return ["tasks.read", "tasks.write"];
    }
  }

  return [
    "orders.read",
    "scripts.read",
    "videos.read",
    "payments.read",
    "tickets.write",
  ];
}
