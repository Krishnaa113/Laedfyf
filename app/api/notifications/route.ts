import { NextResponse } from "next/server";
import { requireAccess } from "@/lib/rbac";
import { serializeOptions } from "@/lib/serialize";
import { loadNotificationFeed } from "@/lib/notifications/hub";
import { dispatchDueNotifications } from "@/lib/notifications/scheduler";
import { connectDB } from "@/lib/db";
import mongoose from "mongoose";
import { Notification } from "@/models/Notification";

export async function GET(request: Request) {
  const auth = await requireAccess("notifications", "read");
  if (!auth.ok) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const unreadOnly = searchParams.get("unread") === "1";
  const limit = Number(searchParams.get("limit") ?? 30);

  void dispatchDueNotifications();

  const feed = await loadNotificationFeed(auth.session.user.id, {
    audience: serializeOptions(auth.session.user).audience,
    unreadOnly,
    limit: Number.isFinite(limit) ? limit : 30,
  });

  return NextResponse.json(feed);
}

export async function PATCH(request: Request) {
  const auth = await requireAccess("notifications", "read");
  if (!auth.ok) {
    return auth.response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const payload = body as { all?: boolean; ids?: unknown };
  await connectDB();
  const userId = new mongoose.Types.ObjectId(auth.session.user.id);

  if (payload.all) {
    await Notification.updateMany(
      { userId, readAt: null },
      { $set: { readAt: new Date() } },
    );
    return NextResponse.json({ ok: true });
  }

  const ids = Array.isArray(payload.ids)
    ? payload.ids
        .map((id) => String(id))
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
    : [];

  if (ids.length === 0) {
    return NextResponse.json({ error: "No notifications to update" }, { status: 400 });
  }

  await Notification.updateMany(
    { _id: { $in: ids }, userId },
    { $set: { readAt: new Date() } },
  );

  return NextResponse.json({ ok: true });
}
