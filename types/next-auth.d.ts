import type { DefaultSession } from "next-auth";
import type { EmployeeSubRole, Permission, UserRole } from "@/lib/roles";

declare module "next-auth" {
  interface User {
    id: string;
    role: UserRole;
    employeeSubRole: EmployeeSubRole | null;
    clientId: string | null;
    employeeId: string | null;
    permissions: Permission[];
  }

  interface Session {
    user: {
      id: string;
      role: UserRole;
      employeeSubRole: EmployeeSubRole | null;
      clientId: string | null;
      employeeId: string | null;
      permissions: Permission[];
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    employeeSubRole: EmployeeSubRole | null;
    clientId: string | null;
    employeeId: string | null;
    permissions: Permission[];
  }
}
