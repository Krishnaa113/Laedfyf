import { NextResponse } from "next/server";
import { requireAccess } from "@/lib/rbac";
import { dispatchDueNotifications } from "@/lib/notifications/scheduler";

export async function POST() {
  const auth = await requireAccess("notifications", "write");
  if (!auth.ok) {
    return auth.response;
  }

  const result = await dispatchDueNotifications({ force: true });
  return NextResponse.json({ ok: true, ...result });
}
