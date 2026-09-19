import { redirect } from "next/navigation";
import { canAccess, requireAccess, type AuthOk } from "@/lib/rbac";
import { isClientRole, type AccessAction, type AccessModule } from "@/lib/roles";

export async function requirePageAccess(
  module: AccessModule,
  action: AccessAction = "read",
): Promise<AuthOk> {
  const auth = await requireAccess(module, action);
  if (!auth.ok) {
    redirect(auth.response.status === 401 ? "/login" : "/dashboard");
  }
  return auth;
}

export function pageCanWrite(auth: AuthOk, module: AccessModule) {
  return canAccess(auth.session.user, module, "write");
}

export async function requirePortalAccess(
  module: AccessModule,
  action: AccessAction = "read",
): Promise<AuthOk> {
  const auth = await requireAccess(module, action);
  if (!auth.ok) {
    redirect(auth.response.status === 401 ? "/portal/login" : "/portal");
  }
  if (!isClientRole(auth.session.user.role) || !auth.session.user.clientId) {
    redirect("/dashboard");
  }
  return auth;
}
