import { SiteHeader } from "@/components/site-header";
import { canAccess, type AuthSessionUser } from "@/lib/rbac";
import type { AccessModule } from "@/lib/roles";

const NAV: { href: string; label: string; module?: AccessModule }[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/clients", label: "Clients", module: "clients" },
  { href: "/orders", label: "Orders", module: "orders" },
  { href: "/scripts", label: "Scripts", module: "scripts" },
  { href: "/creators", label: "Creators", module: "creators" },
  { href: "/shoots", label: "Shoots", module: "shoots" },
  { href: "/videos", label: "Videos", module: "videos" },
  { href: "/tasks", label: "Tasks", module: "tasks" },
  { href: "/tickets", label: "Tickets", module: "tickets" },
  { href: "/payments", label: "Payments", module: "payments" },
  { href: "/expenses", label: "Expenses", module: "expenses" },
  { href: "/payouts", label: "Payouts", module: "payouts" },
  { href: "/analytics", label: "Analytics", module: "analytics" },
  { href: "/employees", label: "Employees", module: "employees" },
  { href: "/users", label: "Users", module: "users" },
];

export function InternalHeader({
  user,
}: {
  user: Pick<
    AuthSessionUser,
    "email" | "role" | "employeeSubRole" | "clientId" | "permissions"
  >;
}) {
  const links = NAV.filter(
    (item) => !item.module || canAccess(user, item.module, "read"),
  );

  return (
    <SiteHeader
      homeHref="/dashboard"
      links={links}
      userLabel={user.email}
      roleLabel={user.employeeSubRole ?? user.role}
      feedHref="/notifications"
    />
  );
}
