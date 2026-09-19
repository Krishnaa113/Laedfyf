import { NextResponse } from "next/server";
import { loadExecutiveAnalytics } from "@/lib/analytics/hub";
import { requireAccess } from "@/lib/rbac";

export async function GET() {
  const auth = await requireAccess("analytics", "read");
  if (!auth.ok) {
    return auth.response;
  }

  const analytics = await loadExecutiveAnalytics();
  return NextResponse.json({ analytics });
}
