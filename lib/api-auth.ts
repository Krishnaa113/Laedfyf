import { NextResponse } from "next/server";
import { requireAccess, requireRole } from "@/lib/rbac";

export { requireAccess, requireRole };

export async function requireInternalApi() {
  return requireRole(["admin", "employee"]);
}

export function validationError(error: { flatten: () => unknown }) {
  return NextResponse.json(
    { error: "Validation failed", details: error.flatten() },
    { status: 400 },
  );
}
