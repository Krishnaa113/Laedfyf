import { NextResponse } from "next/server";
import { requireAccess } from "@/lib/rbac";
import type { AccessModule } from "@/lib/roles";

export async function protectedModuleStub(moduleName: AccessModule) {
  const auth = await requireAccess(moduleName, "read");
  if (!auth.ok) {
    return auth.response;
  }

  return NextResponse.json(
    {
      ok: false,
      module: moduleName,
      message: `${moduleName} is not implemented yet.`,
    },
    { status: 501 },
  );
}
